package utils

import (
	"crypto/rand"
	"fmt"
	"log"
	"os"

	"github.com/go-gomail/gomail"
	"golang.org/x/crypto/bcrypt"
)

// Hash password
func HashPassword(password string) (string, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(hashedPassword), err
}

// Compare hashed password
func CheckPassword(hashedPassword, password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
	return err == nil
}

// Generate a random 4-digit OTP
func GenerateOTP() string {
	b := make([]byte, 3)
	_, _ = rand.Read(b)
	return fmt.Sprintf("%04d", (int(b[0])<<16|int(b[1])<<8|int(b[2]))%1000000)
}

// send OTP
func SendOTP(email, otp string) error {
	mailer := gomail.NewMessage()
	mailer.SetHeader("From", "subodhbhyri811@gmail.com") // Ensure this email is verified in your SendGrid account.
	mailer.SetHeader("To", email)
	mailer.SetHeader("Subject", "Your Password reset OTP is ")
	mailer.SetBody("text/plain", fmt.Sprintf("Your OTP for password reset is: %s. It is valid for 10 minutes.", otp))

	// Retrieve the API key from your environment variables
	apiKey := os.Getenv("SENDGRID_API_KEY")
	if apiKey == "" {
		log.Println("SENDGRID_API_KEY is not set")
		return fmt.Errorf("SENDGRID_API_KEY not set")
	}

	dialer := gomail.NewDialer("smtp.sendgrid.net", 587, "apikey", apiKey)
	err := dialer.DialAndSend(mailer)
	if err != nil {
		log.Println("Failed to send OTP through email", err)
	}
	return err
}
