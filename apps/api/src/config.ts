import "dotenv/config";

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 16) {
  throw new Error("JWT_SECRET must be set and at least 16 characters long");
}

export const config = { jwtSecret };