package handlers

import (
	"fmt"
	"log"
	"net/http"
	"time"
	"ufpeerassist/backend/api/utils"
	"ufpeerassist/backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/schema"
)

var db *gorm.DB

func init() {
	// PostgreSQL connection string
	dsn := "host=localhost user=postgres password=Noentry@7023 dbname=ufpeerassist port=5432 sslmode=disable"
	var err error
	db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		NamingStrategy: schema.NamingStrategy{
			SingularTable: true, // Prevents pluralization of table names
		},
	})
	if err != nil {
		log.Fatal("Failed to connect to PostgreSQL:", err)
	}

	// Auto-migrate tables
	db.AutoMigrate(&models.Users{}, &models.User_Auth{}, &models.OTP{})

	fmt.Println("Database connected and migrated!")
}

/* Signup Endpoint
* Parameters:
* Name: username
* Email: user email id
* Password: new password entered by user
* Mobile: mobile number of the user
 */
func Signup(c *gin.Context) {
	var input struct {
		Name     string `json:"name" binding:"required"`
		Email    string `json:"email" binding:"required,email"`
		Mobile   string `json:"mobile" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	// Bind JSON input
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		fmt.Println("erro in binding")
		return
	}

	// Start a transaction
	tx := db.Begin()

	// Check if user already exists
	var existingUser models.Users
	if err := tx.First(&existingUser, "email = ?", input.Email).Error; err == nil {
		tx.Rollback() // Rollback transaction
		c.JSON(http.StatusConflict, gin.H{"error": "User already exists"})
		return
	}

	// Hash the password
	hashedPassword, err := utils.HashPassword(input.Password)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Insert user into users table
	user := models.Users{
		Email:  input.Email,
		Name:   input.Name,
		Mobile: input.Mobile,
	}
	if err := tx.Create(&user).Error; err != nil {
		tx.Rollback()
		log.Println(err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	// Insert password into user_auth table
	auth := models.User_Auth{
		Email:    input.Email,
		Password: hashedPassword,
	}
	if err := tx.Create(&auth).Error; err != nil {
		tx.Rollback() // If auth insert fails, rollback everything
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to store credentials"})
		return
	}

	// Commit the transaction (if everything succeeds)
	tx.Commit()
	c.JSON(http.StatusCreated, gin.H{"message": "User registered successfully!"})
}

/* Login Endpoint
* Parameters:
* Email: user email id
* Password: password entered by user
 */
func Login(c *gin.Context) {
	var input struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required"`
	}

	// Bind JSON input
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if user exists
	var auth models.User_Auth
	if err := db.First(&auth, "email = ?", input.Email).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or signup before login"})
		return
	}

	// Verify password
	if !utils.CheckPassword(auth.Password, input.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	// Success response
	c.JSON(http.StatusOK, gin.H{"message": "Login successful!"})
}

/* Request-Reset-Password Endpoint: this function will send an otp which is valid for 10 minutes to input email address
* Parameters
* email: to send the otp
 */
func GenerateOTPForResetPassword(c *gin.Context) {
	var request struct {
		Email string `json:"email"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	var user models.Users
	if err := db.Where("email = ?", request.Email).First(&user).Error; err != nil {
		c.JSON(404, gin.H{"error": "User not found"})
		return
	}

	otp := utils.GenerateOTP()
	db.Save(&models.OTP{
		Email:      request.Email,
		Code:       otp,
		Expires_At: time.Now().Add(10 * time.Minute),
	})

	if err := utils.SendOTP(request.Email, otp); err != nil {
		c.JSON(500, gin.H{"error": "Failed to send OTP"})
		fmt.Println("failed to send OTP")
		return
	}

	c.JSON(200, gin.H{"message": "OTP sent to your email"})
}

/* Validate-OTP Endpoint: this function will validate the otp entered by user for password change
* Parameters
* email: user email id for which passwords needs to reset
* otp: code which is valid for 10 minutes
 */
func ValidateOtpAndUpdatePassword(c *gin.Context) {
	var request struct {
		Email    string `json:"email"`
		OTP      string `json:"otp"`
		Password string `json:"password"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	var storedOTP models.OTP
	if err := db.Where("email = ? AND code = ?", request.Email, request.OTP).First(&storedOTP).Error; err != nil {
		c.JSON(401, gin.H{"error": "Invalid OTP"})
		return
	}

	if time.Now().UTC().After(storedOTP.Expires_At.UTC()) {
		c.JSON(401, gin.H{"error": "OTP expired"})
		fmt.Println((time.Now().UTC()))
		fmt.Println(storedOTP.Expires_At.UTC())
		return
	}

	// as OTP is validated, update the password by encrypting
	// Hash the password
	hashedPassword, err := utils.HashPassword(request.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Update password into user_auth table
	db.Save(&models.User_Auth{
		Email:    request.Email,
		Password: hashedPassword,
	})

	c.JSON(200, gin.H{"message": "OTP Verified. New password is updated!"})
}
