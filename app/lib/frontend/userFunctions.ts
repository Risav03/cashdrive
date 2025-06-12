import axios from "axios";
import { User } from "../types";


// Fetches the currently logged-in user.
export async function getCurrentUser(): Promise<User> {
    try {
      const response = await axios.get('/api/user');
      return response.data.user;
    } catch (error: any) {
      if (error.response && error.response.status === 401) {
        throw new Error('Unauthorized');
      }
      throw new Error(error.message || 'Failed to fetch user');
    }
  }
  
  