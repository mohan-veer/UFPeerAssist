package utils

import (
	"crypto/rand"
	"fmt"
	"log"

	"github.com/go-gomail/gomail"
	"golang.org/x/crypto/bcrypt"
)

// HashPassword hashes a plain-text password using bcrypt
// Hash password
func HashPassword(password string) (string, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(hashedPassword), err
}

// CheckPassword compares a hashed password with a plain-text one
// Compare hashed password
func CheckPassword(hashedPassword, password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
	return err == nil
}

// GenerateOTP creates a random 6-digit OTP
func GenerateOTP() string {
	b := make([]byte, 3)
	_, _ = rand.Read(b)
	return fmt.Sprintf("%06d", (int(b[0])<<16|int(b[1])<<8|int(b[2]))%1000000)
}

// SendOTP sends a password reset OTP to the user
func SendOTP(reason, email, otp string) error {
	mailer := gomail.NewMessage()
	mailer.SetHeader("From", "jamusvenkatesh@gmail.com")
	mailer.SetHeader("To", email)

	subject := "Your OTP for password reset"
	body := fmt.Sprintf("Your OTP for password reset is: %s. It is valid for 10 minutes.", otp)

	mailer.SetHeader("Subject", subject)
	mailer.SetBody("text/plain", body)

	dialer := gomail.NewDialer("smtp.sendgrid.net", 587, "apikey", "")

	err := dialer.DialAndSend(mailer)
	if err != nil {
		log.Printf("❌ Failed to send OTP to %s: %v\n", email, err)
	}
	return err
}

// SendEmailNotification sends a task acceptance notification to the selected applicant
func SendEmailNotification(email string, taskTitle string) error {
	mailer := gomail.NewMessage()
	mailer.SetHeader("From", "jamusvenkatesh@gmail.com")
	mailer.SetHeader("To", email)
	mailer.SetHeader("Subject", "Congrats! You've been selected for a task")
	mailer.SetBody("text/plain", fmt.Sprintf(
		"You have been accepted to perform task: %s. Please view scheduled tasks in your dashboard for more information.", taskTitle,
	))

	dialer := gomail.NewDialer("smtp.sendgrid.net", 587, "apikey", "")

	err := dialer.DialAndSend(mailer)
	if err != nil {
		log.Printf("Failed to send task notification to %s: %v\n", email, err)
	}
	return err
}

// Add this function to your utils/user_util.go file

// SendTaskCompletionOTP sends an OTP to the task owner for task completion validation
func SendTaskCompletionOTP(email, otp, taskTitle string) error {
	mailer := gomail.NewMessage()
	mailer.SetHeader("From", "jamusvenkatesh@gmail.com")
	mailer.SetHeader("To", email)
	mailer.SetHeader("Subject", "Task Completion Verification")

	body := fmt.Sprintf(
		"A worker has completed your task: %s.\n\n"+
			"Your OTP for verifying task completion is: %s\n\n"+
			"This OTP is valid for 30 minutes. Please provide this code to complete the task process.",
		taskTitle, otp,
	)

	mailer.SetBody("text/plain", body)

	dialer := gomail.NewDialer("smtp.sendgrid.net", 587, "apikey", "")

	err := dialer.DialAndSend(mailer)
	if err != nil {
		log.Printf("Failed to send task completion OTP to %s: %v\n", email, err)
	}
	return err
}
