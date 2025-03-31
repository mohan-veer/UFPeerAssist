package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// TaskCategory represents the type of work
type TaskCategory string

// Define task categories
const (
	Plumbing      TaskCategory = "Plumbing"
	HouseShifting TaskCategory = "House Shifting"
	Carpentry     TaskCategory = "Carpentry"
	Cleaning      TaskCategory = "Cleaning"
	Electrical    TaskCategory = "Electrical"
	Painting      TaskCategory = "Painting"
	Gardening     TaskCategory = "Gardening"
	Tutoring      TaskCategory = "Tutoring"
	ComputerHelp  TaskCategory = "Computer Help"
	Other         TaskCategory = "Other"
)

// TaskStatus represents the current status of a task
type TaskStatus string

// Define task statuses
const (
	Open       TaskStatus = "Open"
	InProgress TaskStatus = "In Progress"
	Completed  TaskStatus = "Completed"
	Cancelled  TaskStatus = "Cancelled"
)

// Task represents a task posted by a user
type Task struct {
	ID               primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Title            string             `bson:"title" json:"title"`
	Description      string             `bson:"description" json:"description"`
	TaskTime         string             `bson:"task_time" json:"task_time"`
	TaskDate         time.Time          `bson:"task_date" json:"task_date"`
	EstimatedPayRate float64            `bson:"estimated_pay_rate" json:"estimated_pay_rate"` // Per hour
	PlaceOfWork      string             `bson:"place_of_work" json:"place_of_work"`
	WorkType         TaskCategory       `bson:"work_type" json:"work_type"`
	PeopleNeeded     int                `bson:"people_needed" json:"people_needed"`

	// Meta data fields
	CreatorEmail  string     `bson:"creator_email" json:"creator_email"`
	CreatedAt     time.Time  `bson:"created_at" json:"created_at"`
	UpdatedAt     time.Time  `bson:"updated_at" json:"updated_at"`
	Status        TaskStatus `bson:"status" json:"status"`
	Views         int        `bson:"views" json:"views"`
	Applicants    []string   `bson:"applicants" json:"applicants"`         // List of emails of users who applied
	SelectedUsers []string   `bson:"selected_users" json:"selected_users"` // List of emails of users selected for the task
}
