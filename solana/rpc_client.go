package solana

import (
	"context"
	"encoding/binary"
	"fmt"
	"log"
	"math/big"
	"os"
	"strings"
	"sync/atomic"
	"time"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
)

const (
	DefaultRPCURLDevnet = "https://api.devnet.solana.com"
	LamportsPerSOL      = 1_000_000_000
)

// Common USDC mint addresses
const (
	USDCMintDevnet = "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr"
	USDCDecimals   = 6
)

type RPCClient struct {
	clients []*rpc.Client
	// idx points at the current primary endpoint; rotated on rate-limit/network
	// failures so subsequent calls prefer the last healthy node
	idx atomic.Uint64
}

func NewRPCClient() (*RPCClient, error) {
	// Endpoint list: SOLANA_RPC_URL (primary) + SOLANA_RPC_URLS (comma-separated fallbacks).
	// On rate limit / network failure the client rotates automatically.
	var urls []string
	if u := strings.TrimSpace(os.Getenv("SOLANA_RPC_URL")); u != "" {
		urls = append(urls, u)
	}
	if extra := os.Getenv("SOLANA_RPC_URLS"); extra != "" {
		for _, u := range strings.Split(extra, ",") {
			if u = strings.TrimSpace(u); u != "" {
				urls = append(urls, u)
			}
		}
	}
	if len(urls) == 0 {
		urls = []string{DefaultRPCURLDevnet}
	}

	r := &RPCClient{}
	for _, u := range urls {
		r.clients = append(r.clients, rpc.New(u))
	}
	r.idx.Store(0)
	log.Printf("✅ RPC endpoints (%d): %s", len(urls), strings.Join(urls, ", "))
	return r, nil
}

// withFailover runs fn against the current primary endpoint; on failure rotates
// to the next endpoint and retries until all endpoints are exhausted.
func withFailover[T any](r *RPCClient, fn func(c *rpc.Client) (T, error)) (T, error) {
	var lastErr error
	n := len(r.clients)
	start := int(r.idx.Load()) % n
	for k := 0; k < n; k++ {
		i := (start + k) % n
		v, err := fn(r.clients[i])
		if err == nil {
			if i != start {
				log.Printf("✅ RPC recovered via endpoint #%d", i)
			}
			return v, nil
		}
		lastErr = err
		log.Printf("⚠️ RPC endpoint #%d failed (%v), rotating", i, shorthand(err))
	}
	return *new(T), lastErr
}

func shorthand(err error) string {
	s := err.Error()
	if len(s) > 90 {
		s = s[:90] + "…"
	}
	return s
}

func (r *RPCClient) RPCClient() *rpc.Client {
	return r.clients[int(r.idx.Load())%len(r.clients)]
}

func (r *RPCClient) GetRecentSignatures(address string, limit int, since time.Time) ([]string, error) {
	pubkey, err := solana.PublicKeyFromBase58(address)
	if err != nil {
		return nil, fmt.Errorf("invalid Solana address: %w", err)
	}

	if limit <= 0 {
		limit = 20
	}
	opts := &rpc.GetSignaturesForAddressOpts{
		Limit:      &limit,
		Commitment: rpc.CommitmentConfirmed,
	}

	sigs, err := withFailover(r, func(c *rpc.Client) ([]*rpc.TransactionSignature, error) {
		return c.GetSignaturesForAddressWithOpts(context.TODO(), pubkey, opts)
	})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch signature list: %w", err)
	}

	out := make([]string, 0, len(sigs))
	for _, s := range sigs {
		if s.Err != nil {
			continue
		}
		if !since.IsZero() && s.BlockTime != nil {
			blockUnix := int64(*s.BlockTime)
			if time.Unix(blockUnix, 0).Before(since) {
				continue
			}
		}
		out = append(out, s.Signature.String())
	}
	return out, nil
}

// TransferInfo holds incoming transfer info for the receiver address from a transaction
type TransferInfo struct {
	Amount    *big.Int   // incoming amount (lamports for SOL, smallest unit for USDC)
	From      string     // payer address (fee payer)
	BlockTime *time.Time // on-chain time
	Success   bool
}

// getParsedTransaction fetches and parses a transaction, filtering out nonexistent/failed ones
func (r *RPCClient) getParsedTransaction(txHash string) (tx *solana.Transaction, meta *rpc.TransactionMeta, blockTime *time.Time, err error) {
	sig, err := solana.SignatureFromBase58(txHash)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("invalid transaction hash: %w", err)
	}

	txOut, err := withFailover(r, func(c *rpc.Client) (*rpc.GetTransactionResult, error) {
		return c.GetTransaction(context.TODO(), sig, &rpc.GetTransactionOpts{
			Encoding:   solana.EncodingBase64,
			Commitment: rpc.CommitmentConfirmed,
		})
	})
	if err != nil {
		return nil, nil, nil, fmt.Errorf("failed to fetch transaction details: %w", err)
	}
	if txOut == nil || txOut.Transaction == nil || txOut.Meta == nil {
		return nil, nil, nil, nil
	}
	if txOut.Meta.Err != nil {
		return nil, nil, nil, nil
	}

	tx, err = txOut.Transaction.GetTransaction()
	if err != nil || tx == nil {
		return nil, nil, nil, nil
	}

	var bt *time.Time
	if txOut.BlockTime != nil {
		t := time.Unix(int64(*txOut.BlockTime), 0)
		bt = &t
	}
	return tx, txOut.Meta, bt, nil
}

func feePayerOf(tx *solana.Transaction) string {
	if len(tx.Message.AccountKeys) > 0 {
		return tx.Message.AccountKeys[0].String()
	}
	return ""
}

// GetSOLTransferDetails parses SOL incoming transfer.
// Primary method: receiver address balance delta. Fallback: parse SystemProgram
// transfer instructions — this also catches self-transfers (sender == receiver),
// where the balance delta is only the negative fee and never positive.
func (r *RPCClient) GetSOLTransferDetails(txHash string, receiverAddr string) (ok bool, info *TransferInfo, err error) {
	tx, meta, blockTime, err := r.getParsedTransaction(txHash)
	if err != nil || tx == nil || meta == nil {
		return false, nil, err
	}

	accountKeys := tx.Message.AccountKeys
	if len(meta.PreBalances) != len(accountKeys) || len(meta.PostBalances) != len(accountKeys) {
		return false, nil, nil
	}

	for i, key := range accountKeys {
		if key.String() != receiverAddr {
			continue
		}
		diff := int64(meta.PostBalances[i]) - int64(meta.PreBalances[i])
		if diff > 0 {
			return true, &TransferInfo{
				Amount:    big.NewInt(diff),
				From:      feePayerOf(tx),
				BlockTime: blockTime,
				Success:   true,
			}, nil
		}
	}

	// Fallback: SystemProgram transfer instructions targeting the receiver
	amount := systemTransferTo(tx, receiverAddr)
	if amount > 0 {
		return true, &TransferInfo{
			Amount:    big.NewInt(amount),
			From:      feePayerOf(tx),
			BlockTime: blockTime,
			Success:   true,
		}, nil
	}
	return false, nil, nil
}

// systemTransferTo sums lamports of SystemProgram (native) transfer instructions
// whose destination is receiverAddr. Instruction layout: u32 discriminator (=2), u64 lamports.
func systemTransferTo(tx *solana.Transaction, receiverAddr string) int64 {
	const systemProgramID = "11111111111111111111111111111111"
	keys := tx.Message.AccountKeys
	total := int64(0)
	for _, ins := range tx.Message.Instructions {
		progIdx := int(ins.ProgramIDIndex)
		if progIdx >= len(keys) || keys[progIdx].String() != systemProgramID {
			continue
		}
		if len(ins.Accounts) < 2 || len(ins.Data) < 12 {
			continue
		}
		// discriminator = 2 means Transfer
		if ins.Data[0] != 2 || ins.Data[1] != 0 || ins.Data[2] != 0 || ins.Data[3] != 0 {
			continue
		}
		dstIdx := int(ins.Accounts[1])
		if dstIdx >= len(keys) || keys[dstIdx].String() != receiverAddr {
			continue
		}
		total += int64(binary.LittleEndian.Uint64(ins.Data[4:12]))
	}
	return total
}

// GetUSDCTransferDetails parses USDC (SPL Token) incoming transfer (token balance delta method):
// For token accounts matching the mint, sum positive differences between post and pre raw amounts.
func (r *RPCClient) GetUSDCTransferDetails(txHash string, receiverAddr string, mintAddr string) (ok bool, info *TransferInfo, err error) {
	tx, meta, blockTime, err := r.getParsedTransaction(txHash)
	if err != nil || tx == nil || meta == nil {
		return false, nil, err
	}

	// Index pre balances by accountIndex
	preByIndex := map[uint16]*big.Int{}
	for _, b := range meta.PreTokenBalances {
		if b.Mint.String() != mintAddr || b.UiTokenAmount == nil {
			continue
		}
		amt, _ := new(big.Int).SetString(b.UiTokenAmount.Amount, 10)
		if amt == nil {
			amt = big.NewInt(0)
		}
		preByIndex[uint16(b.AccountIndex)] = amt
	}

	total := big.NewInt(0)
	for _, b := range meta.PostTokenBalances {
		if b.Mint.String() != mintAddr || b.UiTokenAmount == nil {
			continue
		}
		post, _ := new(big.Int).SetString(b.UiTokenAmount.Amount, 10)
		if post == nil {
			continue
		}
		pre := preByIndex[uint16(b.AccountIndex)]
		if pre == nil {
			pre = big.NewInt(0)
		}
		if diff := new(big.Int).Sub(post, pre); diff.Sign() > 0 {
			total.Add(total, diff)
		}
	}

	if total.Sign() <= 0 {
		return false, nil, nil
	}
	return true, &TransferInfo{
		Amount:    total,
		From:      feePayerOf(tx),
		BlockTime: blockTime,
		Success:   true,
	}, nil
}
