# Use Node.js with full language support
FROM node:20-bullseye

# Install all compilers
RUN apt-get update && apt-get install -y \
    default-jdk \
    gcc \
    g++ \
    golang \
    php \
    ruby \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json .
RUN npm install
COPY . .

EXPOSE 3002
CMD ["npm", "start"]
