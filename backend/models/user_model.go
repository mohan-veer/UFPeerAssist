package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// User model (Users Table)
type Users struct {
	Email          string `gorm:"primaryKey" json:"email"`
	Name           string `json:"name"`
	Mobile         string `json:"mobile"`
	CompletedTasks int    `json:"completedTasks"`
	Rating         string `json:"rating"`
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

// TaskCompletionOTP struct for task completion validation
type TaskCompletionOTP struct {
	Email       string             `bson:"email"`        // Task owner's email
	Code        string             `bson:"code"`         // OTP code
	Expires_At  time.Time          `bson:"expires_at"`   // Expiration timestamp
	Context     string             `bson:"context"`      // Context identifier (task_completion)
	TaskID      primitive.ObjectID `bson:"task_id"`      // Associated task ID
	WorkerEmail string             `bson:"worker_email"` // Worker who completed the task
}
