package tests

import (
	"bytes"
	"context"
	"encoding/json"
	"log"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"
	"ufpeerassist/backend/api/utils"
	"ufpeerassist/backend/models"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	testClient *mongo.Client
	testDB     *mongo.Database
	router     *gin.Engine
)

// Mock handler functions to avoid using the actual handlers that depend on the global collections
func mockSignupHandler(c *gin.Context) {
	var input struct {
		Name     string `json:"name" binding:"required"`
		Email    string `json:"email" binding:"required,email"`
		Mobile   string `json:"mobile" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if user already exists
	var existingUser models.Users
	err := testDB.Collection("users").FindOne(context.TODO(), bson.M{"email": input.Email}).Decode(&existingUser)
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "User already exists"})
		return
	}

	// Hash the password
	hashedPassword, err := utils.HashPassword(input.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Start MongoDB Transaction
	session, err := testClient.StartSession()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction"})
		return
	}
	defer session.EndSession(context.TODO())

	// Transaction Function
	callback := func(sessCtx mongo.SessionContext) (interface{}, error) {
		// Insert user
		_, err := testDB.Collection("users").InsertOne(sessCtx, models.Users{
			Email:  input.Email,
			Name:   input.Name,
			Mobile: input.Mobile,
		})
		if err != nil {
			return nil, err
		}

		// Insert authentication data
		_, err = testDB.Collection("auth").InsertOne(sessCtx, models.User_Auth{
			Email:    input.Email,
			Password: hashedPassword,
		})
		if err != nil {
			return nil, err
		}

		return nil, nil
	}

	// Execute transaction
	_, err = session.WithTransaction(context.TODO(), callback)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction failed", "details": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "User registered successfully!"})
}

// Mock login handler
func mockLoginHandler(c *gin.Context) {
	var input struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var auth models.User_Auth
	err := testDB.Collection("auth").FindOne(context.TODO(), bson.M{"email": input.Email}).Decode(&auth)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or signup before login"})
		return
	}

	// Verify password
	if !utils.CheckPassword(auth.Password, input.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Login successful!"})
}

// Add these mock handlers to your test file

// Mock GetUserProfile handler
func mockGetUserProfile(c *gin.Context) {
	// Get email from URL parameter
	email := c.Param("email")

	// Define a struct to hold the user data
	type UserProfile struct {
		Email  string `json:"email" bson:"email"`
		Name   string `json:"name" bson:"name"`
		Mobile string `json:"mobile" bson:"mobile"`
	}

	var profile UserProfile

	// Find the user by email
	err := testDB.Collection("users").FindOne(
		context.TODO(),
		bson.M{"email": email},
	).Decode(&profile)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve profile", "details": err.Error()})
		return
	}

	// Return the user profile
	c.JSON(http.StatusOK, profile)
}

// Mock UpdateUserProfile handler
func mockUpdateUserProfile(c *gin.Context) {
	// Get email from URL parameter
	email := c.Param("email")

	// Define input structure for profile update
	var input struct {
		Name   string `json:"name" binding:"omitempty"`
		Mobile string `json:"mobile" binding:"omitempty"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Prepare update document with only provided fields
	updateDoc := bson.M{}

	if input.Name != "" {
		updateDoc["name"] = input.Name
	}

	if input.Mobile != "" {
		updateDoc["mobile"] = input.Mobile
	}

	// If no fields were provided to update
	if len(updateDoc) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No fields provided for update"})
		return
	}

	// Update the user profile
	result, err := testDB.Collection("users").UpdateOne(
		context.TODO(),
		bson.M{"email": email},
		bson.M{"$set": updateDoc},
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile", "details": err.Error()})
		return
	}

	if result.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Profile updated successfully",
		"updated": result.ModifiedCount > 0,
	})
}

// TestMain is used for test setup and teardown
func TestMain(m *testing.M) {
	// Initialize the test database before running tests
	setup()

	// Run the tests
	code := m.Run()

	// Clean up after tests
	teardown()

	// Exit with the test result code
	os.Exit(code)
}

// setup initializes the test database and seeds it with test data
func setup() {
	// Set Gin to test mode
	gin.SetMode(gin.TestMode)

	// Connect to MongoDB
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var err error
	testClient, err = mongo.Connect(ctx, options.Client().ApplyURI("mongodb://localhost:27017"))
	if err != nil {
		log.Fatalf("Failed to connect to test database: %v", err)
	}

	// Use a test database with a unique name to avoid conflicts
	testDB = testClient.Database("ufpeerassist_test")

	// Clear existing data from collections we'll use
	testDB.Collection("users").DeleteMany(ctx, bson.M{})
	testDB.Collection("auth").DeleteMany(ctx, bson.M{})
	testDB.Collection("otp").DeleteMany(ctx, bson.M{})

	// Seed with test data
	seedTestData(ctx)

	// Initialize router with our mock handlers
	router = gin.Default()

	// Define routes using our mock handlers instead of the actual ones
	router.POST("/signup", mockSignupHandler)
	router.POST("/login", mockLoginHandler)
	router.GET("/users/:email/profileinfo", mockGetUserProfile)
	router.PUT("/users/:email/profileupdate", mockUpdateUserProfile)
}

// teardown cleans up after tests
func teardown() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Drop the test database
	testDB.Drop(ctx)

	// Disconnect from MongoDB
	testClient.Disconnect(ctx)
}

// seedTestData populates the test database with test data
func seedTestData(ctx context.Context) {
	// Create a test user with hashed password
	hashedPassword, err := utils.HashPassword("Test@1234$")
	if err != nil {
		log.Fatalf("Failed to hash password: %v", err)
	}

	// Insert test users
	_, err = testDB.Collection("users").InsertOne(ctx, models.Users{
		Name:   "TestUser",
		Email:  "test@example.com",
		Mobile: "1234567890",
	})
	if err != nil {
		log.Fatalf("Failed to seed test users: %v", err)
	}

	_, err = testDB.Collection("auth").InsertOne(ctx, models.User_Auth{
		Email:    "test@example.com",
		Password: hashedPassword,
	})
	if err != nil {
		log.Fatalf("Failed to seed test user auth: %v", err)
	}
}

// Test successful user signup
func TestUserSignupSuccess(t *testing.T) {
	// Create test request with new user data
	signupData := map[string]string{
		"name":     "New User",
		"email":    "newuser@example.com",
		"mobile":   "1234567890",
		"password": "password123",
	}

	jsonData, _ := json.Marshal(signupData)
	req, _ := http.NewRequest("POST", "/signup", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()

	// Serve the request
	router.ServeHTTP(w, req)

	// Log response for debugging
	t.Logf("Response Status: %d", w.Code)
	t.Logf("Response Body: %s", w.Body.String())

	// Assertions
	assert.Equal(t, http.StatusCreated, w.Code, "Expected status 201 Created, got %d with body: %s", w.Code, w.Body.String())

	// Parse the response
	var response struct {
		Message string `json:"message"`
	}
	err := json.NewDecoder(w.Body).Decode(&response)

	assert.NoError(t, err, "Failed to parse response body")
	assert.Equal(t, "User registered successfully!", response.Message,
		"Expected success message but got: %s", response.Message)

	// Check that the user was actually created in the database
	var user models.Users
	err = testDB.Collection("users").FindOne(context.Background(), bson.M{"email": "newuser@example.com"}).Decode(&user)
	assert.NoError(t, err, "User should exist in the database")
	assert.Equal(t, "New User", user.Name)
}

// Test signup with existing email
func TestUserSignupExistingEmail(t *testing.T) {
	// Try to signup with an email that already exists in the test data
	signupData := map[string]string{
		"name":     "Duplicate User",
		"email":    "test@example.com", // This email already exists from seedTestData
		"mobile":   "9876543210",
		"password": "password456",
	}

	jsonData, _ := json.Marshal(signupData)
	req, _ := http.NewRequest("POST", "/signup", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusConflict, w.Code, "Expected status 409 Conflict for duplicate email")

	var response struct {
		Error string `json:"error"`
	}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")
	assert.Equal(t, "User already exists", response.Error)
}

// Test signup with invalid input
func TestUserSignupInvalidInput(t *testing.T) {
	// Missing required fields
	signupData := map[string]string{
		"name": "Invalid User",
		// Missing email
		"mobile":   "1234567890",
		"password": "password123",
	}

	jsonData, _ := json.Marshal(signupData)
	req, _ := http.NewRequest("POST", "/signup", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusBadRequest, w.Code, "Expected status 400 Bad Request for missing fields")
}

// Test successful login
func TestLoginSuccess(t *testing.T) {
	// Create login data with credentials from seeded test data
	loginData := map[string]string{
		"email":    "test@example.com",
		"password": "Test@1234$",
	}

	jsonData, _ := json.Marshal(loginData)
	req, _ := http.NewRequest("POST", "/login", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Log response for debugging
	t.Logf("Response Status: %d", w.Code)
	t.Logf("Response Body: %s", w.Body.String())

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code, "Expected status 200 OK for successful login")

	var response struct {
		Message string `json:"message"`
	}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")
	assert.Equal(t, "Login successful!", response.Message)
}

// Test login with invalid email
func TestLoginInvalidEmail(t *testing.T) {
	loginData := map[string]string{
		"email":    "nonexistent@example.com",
		"password": "Test@1234$",
	}

	jsonData, _ := json.Marshal(loginData)
	req, _ := http.NewRequest("POST", "/login", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusUnauthorized, w.Code, "Expected status 401 Unauthorized for nonexistent email")

	var response struct {
		Error string `json:"error"`
	}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")
	assert.Equal(t, "Invalid email or signup before login", response.Error)
}

// Test login with incorrect password
func TestLoginIncorrectPassword(t *testing.T) {
	loginData := map[string]string{
		"email":    "test@example.com", // Email exists
		"password": "WrongPassword",    // But password is wrong
	}

	jsonData, _ := json.Marshal(loginData)
	req, _ := http.NewRequest("POST", "/login", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusUnauthorized, w.Code, "Expected status 401 Unauthorized for wrong password")

	var response struct {
		Error string `json:"error"`
	}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")
	assert.Equal(t, "Invalid email or password", response.Error)
}

// Test login with missing credentials
func TestLoginMissingCredentials(t *testing.T) {
	loginData := map[string]string{
		"email": "test@example.com",
		// Missing password
	}

	jsonData, _ := json.Marshal(loginData)
	req, _ := http.NewRequest("POST", "/login", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusBadRequest, w.Code, "Expected status 400 Bad Request for missing credentials")
}

func TestGetUserProfile_Success(t *testing.T) {
	// Create a request to get the profile
	req, _ := http.NewRequest("GET", "/users/test@example.com/profileinfo", nil)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Log response for debugging
	t.Logf("Response Status: %d", w.Code)
	t.Logf("Response Body: %s", w.Body.String())

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code, "Expected status 200 OK for profile retrieval")

	// Parse the response
	var profile struct {
		Email  string `json:"email"`
		Name   string `json:"name"`
		Mobile string `json:"mobile"`
	}

	err := json.NewDecoder(w.Body).Decode(&profile)
	assert.NoError(t, err, "Failed to parse response body")

	// Verify the response contains the correct user data
	assert.Equal(t, "test@example.com", profile.Email, "Email should match")
	assert.Equal(t, "TestUser", profile.Name, "Name should match test data")
	assert.Equal(t, "1234567890", profile.Mobile, "Mobile should match test data")

	// Ensure password is not included in the response
	var responseMap map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &responseMap)
	_, hasPassword := responseMap["password"]
	assert.False(t, hasPassword, "Response should not include password field")
}

func TestGetUserProfile_UserNotFound(t *testing.T) {
	// Create a request with a non-existent email
	req, _ := http.NewRequest("GET", "/users/nonexistent@example.com/profileinfo", nil)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Log response for debugging
	t.Logf("Response Status: %d", w.Code)
	t.Logf("Response Body: %s", w.Body.String())

	// Assertions
	assert.Equal(t, http.StatusNotFound, w.Code, "Expected status 404 Not Found for non-existent user")

	var response struct {
		Error string `json:"error"`
	}

	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")
	assert.Equal(t, "User not found", response.Error, "Response should indicate user not found")
}

// Fix for TestUpdateUserProfile_Success
func TestUpdateUserProfile_Success(t *testing.T) {
	// Create test request with profile update data
	updateData := map[string]string{
		"name":   "Updated Name",
		"mobile": "9876543210",
	}

	jsonData, _ := json.Marshal(updateData)

	// Use the test email from seed data
	req, _ := http.NewRequest("PUT", "/users/test@example.com/profileupdate", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Log response for debugging
	t.Logf("Response Status: %d", w.Code)
	t.Logf("Response Body: %s", w.Body.String())

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code, "Expected status 200 OK for profile update")

	var response struct {
		Message string `json:"message"`
		Updated bool   `json:"updated"`
	}

	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err, "Failed to parse response body")
	assert.Equal(t, "Profile updated successfully", response.Message)
	assert.True(t, response.Updated, "Profile should be updated")

	// Verify the update in the database
	var user models.Users
	err = testDB.Collection("users").FindOne(context.Background(), bson.M{"email": "test@example.com"}).Decode(&user)
	assert.NoError(t, err, "User should exist in the database")
	assert.Equal(t, "Updated Name", user.Name, "User name should be updated")
	assert.Equal(t, "9876543210", user.Mobile, "User mobile should be updated")
}

// Fix for TestUpdateUserProfile_PartialUpdate - replace usersCollection with testDB
func TestUpdateUserProfile_PartialUpdate(t *testing.T) {
	// First update both name and mobile
	initialUpdate := map[string]string{
		"name":   "Initial Name",
		"mobile": "1122334455",
	}

	jsonData, _ := json.Marshal(initialUpdate)
	req, _ := http.NewRequest("PUT", "/users/test@example.com/profileupdate", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code, "Initial update should succeed")

	// Now update only the name
	partialUpdate := map[string]string{
		"name": "Partial Update Name",
	}

	jsonData, _ = json.Marshal(partialUpdate)
	req, _ = http.NewRequest("PUT", "/users/test@example.com/profileupdate", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Log response for debugging
	t.Logf("Response Status: %d", w.Code)
	t.Logf("Response Body: %s", w.Body.String())

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code, "Expected status 200 OK for partial update")

	// Verify in database that name was updated but mobile remains unchanged
	var user models.Users
	err := testDB.Collection("users").FindOne(context.Background(), bson.M{"email": "test@example.com"}).Decode(&user)
	assert.NoError(t, err, "User should exist in the database")
	assert.Equal(t, "Partial Update Name", user.Name, "User name should be updated")
	assert.Equal(t, "1122334455", user.Mobile, "User mobile should remain unchanged")
}
