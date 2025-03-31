// src/utils/auth.js

/**
 * Extracts the user email from the JWT token stored in localStorage
 * @returns {string|null} The user's email or null if not found/invalid
 */
export const getUserEmailFromToken = () => {
    const token = localStorage.getItem("token");
    if (!token) return null;
    
    try {
      // JWT tokens are in format: header.payload.signature
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      // Base64 decode the payload
      const payload = atob(parts[1]);
      
      // Parse the JSON
      const parsedPayload = JSON.parse(payload);
      
      return parsedPayload.email;
    } catch (error) {
      console.error("Error extracting email from token:", error);
      return null;
    }
  };
  
  /**
   * Checks if the user is authenticated (has a token)
   * @returns {boolean} True if authenticated, false otherwise
   */
  export const isAuthenticated = () => {
    return !!localStorage.getItem("token");
  };
  
  /**
   * Gets the authentication token
   * @returns {string|null} The token or null if not found
   */
  export const getToken = () => {
    return localStorage.getItem("token");
  };
  
  /**
   * Logs out the user by removing the token
   */
  export const logout = () => {
    localStorage.removeItem("token");
  };
  
  /**
   * Adds authentication headers to fetch requests
   * @param {Object} options - Fetch options object
   * @returns {Object} Updated options with auth headers
   */
  export const withAuth = (options = {}) => {
    const token = getToken();
    if (!token) return options;
    
    return {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      }
    };
  };
  
  /**
   * Checks if a token is expired
   * @returns {boolean} True if token is expired or invalid
   */
  export const isTokenExpired = () => {
    try {
      const token = getToken();
      if (!token) return true;
      
      const parts = token.split('.');
      if (parts.length !== 3) return true;
      
      const payload = JSON.parse(atob(parts[1]));
      const expiry = payload.exp;
      
      return expiry * 1000 < Date.now();
    } catch (error) {
      console.error("Error checking token expiration:", error);
      return true;
    }
  };
  
  /**
   * Authenticated fetch utility
   * @param {string} url - The URL to fetch
   * @param {Object} options - Fetch options
   * @returns {Promise} Fetch promise
   */
  export const authFetch = (url, options = {}) => {
    return fetch(url, withAuth(options));
  };
  