package models

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
