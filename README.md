# LinkedIn Profile Scraper (Chrome Extension + Node.js)

A full-stack LinkedIn profile scraper built using a **Chrome Extension**, **Node.js/Express API**, and **Sequelize + SQLite**.  
Automatically opens multiple LinkedIn profile URLs, extracts key details, and stores them in a backend database.

---

##  Features

- Auto-opens LinkedIn profiles (one by one)
- Scrapes:
  - Name  
  - Headline / Bio Line  
  - About Section  
  - Bio (first line of About)  
  - Location  
  - Followers  
  - Connections  
- Sends scraped data to backend API  
- Uses Sequelize  + SQLite  
- Prevents duplicates using URL uniqueness  
- Smart scraping logic with scroll + wait

---

##  Tech Stack

- **Chrome Extension** (tabs, scripting, storage APIs)  
- **Node.js + Express**  
- **Sequelize ORM**  
- **SQLite**  
- **CORS-enabled REST API**

---

## 📡 API Endpoints

### `POST /api/profiles`
Store or update a LinkedIn profile.

### `GET /api/profiles`
Fetch all profiles from the database.

---

## Setup

### 1. Backend Setup

cd linkedin-backend

npm install

node index.js

Backend runs at: [http://127.0.0.1:3000](http://127.0.0.1:3000)

### 2. Chrome Extension
1. Open `chrome://extensions/`
2. Enable **Developer Mode**
3. Click **Load Unpacked**
4. Select the `extension/` folder

##  Usage

1. Open extension popup
2. Enter **minimum 3** LinkedIn profile URLs (one per line)
3. Click **Start Scraping**
4. View results at: [http://127.0.0.1:3000/api/profiles](http://127.0.0.1:3000/api/profiles)
