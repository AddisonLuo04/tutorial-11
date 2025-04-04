import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

/*
 * This provider should export a `user` context state that is 
 * set (to non-null) when:
 *     1. a hard reload happens while a user is logged in.
 *     2. the user just logged in.
 * `user` should be set to null when:
 *     1. a hard reload happens when no users are logged in.
 *     2. the user just logged out.
 */
export const AuthProvider = ({ children }) => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    // fetch the user data using the stored token
    const fetchUserData = async (token) => {
        try {
            const res = await fetch(`${BACKEND_URL}/user/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!res.ok) {
                throw new Error('Failed to fetch user data.');
            }
            const data = await res.json();
            setUser(data.user);
        } catch (error) {
            console.error(error);
            setUser(null);
            // throw error again for login to catch
            throw error;
        }
    };

    // provide empty list for dependency for useEffect so that on mount, 
    // we check for an existing token and fetch user data if available
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            (async () => {
                try {
                  await fetchUserData(token);
                } catch (error) {
                  console.error("Error fetching user data on mount:", error);
                }
              })();
        } else {
            setUser(null);
        }
    }, []);


    /*
     * Logout the currently authenticated user.
     *
     * @remarks This function will always navigate to "/".
     */
    const logout = () => {
        // does not require any api calls, just remove the token from localStorage
        // and set usercontext to null

        localStorage.removeItem('token');
        setUser(null);
        navigate("/");
    };

    /**
     * Login a user with their credentials.
     *
     * @remarks Upon success, navigates to "/profile". 
     * @param {string} username - The username of the user.
     * @param {string} password - The password of the user.
     * @returns {string} - Upon failure, Returns an error message.
     */
    const login = async (username, password) => {
        // no need to do any validation, just try to fetch from backend and 
        // backend will throw an error if invalid
        try {
            const res = await fetch(`${BACKEND_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            // check if we received an error
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message);
            }

            const data = await res.json();
            // store token in localStorage
            localStorage.setItem('token', data.token);
            // update the user context state by fetching user data
            await fetchUserData(data.token);
            // redirect to the /profile page
            navigate('/profile');
        } catch (error) {
            return error.message;
        }
    };

    /**
     * Registers a new user. 
     * 
     * @remarks Upon success, navigates to "/".
     * @param {Object} userData - The data of the user to register.
     * @returns {string} - Upon failure, returns an error message.
     */
    const register = async (userData) => {
        try {
            const res = await fetch(`${BACKEND_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            // check if we received an error
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message);
            }

            // otherwise, navigate to /success page
            navigate('/success');
        } catch (error) {
            return error.message;
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, register }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
