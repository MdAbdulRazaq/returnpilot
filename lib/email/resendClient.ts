// Singleton Resend SDK client wrapper
import { Resend } from 'resend';
import { getEnv } from '../env';

// Initialize Resend with API key from environment
const env = getEnv();
const resend = new Resend(env.RESEND_API_KEY);

export default resend as Resend;