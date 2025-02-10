package models

import "time"

// User model (Users Table)
type Users struct {
	Email  string `gorm:"primaryKey" json:"email"`
	Name   string `json:"name"`
	Mobile string `json:"mobile"`
}

// UserAuth model (UserAuth Table)
type User_Auth struct {
	Email    string `gorm:"primaryKey" json:"email"`
	Password string `json:"password"`
}

// OTP struct
type OTP struct {
	Email      string    `gorm:"primaryKey"`
	Code       string    `gorm:"not null"`
	Expires_At time.Time `gorm:"not null"`
}
