FROM ubuntu:22.04

RUN apt-get update && apt-get install -y curl gnupg2
# Add NodeSource repository for latest Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
RUN apt-get install -y nodejs

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx playwright install
RUN npx playwright install-deps

CMD ["npm", "test"]
