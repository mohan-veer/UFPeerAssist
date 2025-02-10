package handlers

import (
	"fmt"
	"log"
	"net/http"
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
	dsn := "host=localhost user=postgres password=qwerty dbname=UfPeerAssist port=5432 sslmode=disable"
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
	db.AutoMigrate(&models.Users{}, &models.User_Auth{})

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
