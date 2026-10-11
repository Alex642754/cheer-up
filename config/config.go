package config

import (
	"fmt"
	"os"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

type DBConfig struct {
	User     string
	Password string
	Host     string
	Port     string
	DBName   string
}

func LoadDBConfig() DBConfig {
	user := os.Getenv("DB_USER")
	if user == "" {
		user = "root"
	}
	password := os.Getenv("DB_PASSWORD")
	if password == "" {
		password = "root123"
	}
	host := os.Getenv("DB_HOST")
	if host == "" {
		host = "127.0.0.1"
	}
	port := os.Getenv("DB_PORT")
	if port == "" {
		port = "3306"
	}
	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "solana_pay"
	}
	return DBConfig{
		User:     user,
		Password: password,
		Host:     host,
		Port:     port,
		DBName:   dbName,
	}
}

func InitDB() (*gorm.DB, error) {
	cfg := LoadDBConfig()
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		cfg.User, cfg.Password, cfg.Host, cfg.Port, cfg.DBName)

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get underlying DB: %w", err)
	}
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)

	return db, nil
}
