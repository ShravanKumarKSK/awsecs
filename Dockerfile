# Use an official Node.js runtime as the base image
FROM node:18.15.0

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Install dependencies

RUN npm install 


# Copy the application code to the container
COPY . .

# Expose the port on which your Node.js application listens
EXPOSE 6000

# Start the Node.js application
CMD ["npm", "run","dev"]
