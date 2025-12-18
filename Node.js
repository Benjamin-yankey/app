require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// AWS RDS Database Configuration
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Initialize database table
async function initDatabase() {
  try {
    const connection = await pool.getConnection();

    // Create table if it doesn't exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    connection.release();
    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}

// Initialize database on startup
initDatabase();

// Home page with form
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Simple Form</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: Arial, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          padding: 20px;
        }
        .container {
          background: white;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          width: 100%;
          max-width: 400px;
        }
        h1 {
          color: #333;
          margin-bottom: 20px;
          text-align: center;
        }
        .form-group {
          margin-bottom: 15px;
        }
        label {
          display: block;
          margin-bottom: 5px;
          color: #555;
        }
        input, textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 5px;
          font-size: 14px;
        }
        textarea {
          resize: vertical;
          min-height: 80px;
        }
        button {
          width: 100%;
          padding: 12px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 5px;
          font-size: 16px;
          cursor: pointer;
        }
        button:hover {
          background: #764ba2;
        }
        .links {
          margin-top: 15px;
          text-align: center;
        }
        .links a {
          color: #667eea;
          text-decoration: none;
          margin: 0 10px;
        }
        .links a:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Contact Form</h1>
        <form action="/submit" method="POST">
          <div class="form-group">
            <label for="name">Name:</label>
            <input type="text" id="name" name="name" required>
          </div>
          
          <div class="form-group">
            <label for="email">Email:</label>
            <input type="email" id="email" name="email" required>
          </div>
          
          <div class="form-group">
            <label for="message">Message:</label>
            <textarea id="message" name="message" required></textarea>
          </div>
          
          <button type="submit">Submit</button>
        </form>
        <div class="links">
          <a href="/contacts">View All Contacts</a>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Handle form submission
app.post("/submit", async (req, res) => {
  const { name, email, message } = req.body;

  try {
    // Insert data into database
    const [result] = await pool.query(
      "INSERT INTO contacts (name, email, message) VALUES (?, ?, ?)",
      [name, email, message]
    );

    console.log("Form submitted and saved to database:");
    console.log("ID:", result.insertId);
    console.log("Name:", name);
    console.log("Email:", email);
    console.log("Message:", message);

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Success</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
          }
          .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            width: 100%;
            max-width: 400px;
            text-align: center;
          }
          h1 { color: #4CAF50; margin-bottom: 20px; }
          p { color: #555; margin: 10px 0; }
          .links {
            margin-top: 20px;
          }
          a {
            display: inline-block;
            margin: 5px;
            padding: 10px 20px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 5px;
          }
          a:hover { background: #764ba2; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>✓ Success!</h1>
          <p>Data saved to database</p>
          <p><strong>ID:</strong> ${result.insertId}</p>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong> ${message}</p>
          <div class="links">
            <a href="/">Back to Form</a>
            <a href="/contacts">View All</a>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).send("Error saving to database");
  }
});

// View all contacts
app.get("/contacts", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM contacts ORDER BY created_at DESC"
    );

    let contactsHTML = rows
      .map(
        (contact) => `
      <div class="contact-card">
        <h3>${contact.name}</h3>
        <p><strong>Email:</strong> ${contact.email}</p>
        <p><strong>Message:</strong> ${contact.message}</p>
        <p class="date">${new Date(contact.created_at).toLocaleString()}</p>
        <button onclick="deleteContact(${contact.id})">Delete</button>
      </div>
    `
      )
      .join("");

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>All Contacts</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
          }
          .header {
            text-align: center;
            color: white;
            margin-bottom: 30px;
          }
          .header h1 {
            margin-bottom: 10px;
          }
          .header a {
            color: white;
            text-decoration: none;
            padding: 10px 20px;
            background: rgba(255,255,255,0.2);
            border-radius: 5px;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
          }
          .contact-card {
            background: white;
            padding: 20px;
            margin-bottom: 15px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .contact-card h3 {
            color: #333;
            margin-bottom: 10px;
          }
          .contact-card p {
            color: #555;
            margin: 5px 0;
          }
          .contact-card .date {
            color: #999;
            font-size: 12px;
            margin-top: 10px;
          }
          .contact-card button {
            margin-top: 10px;
            padding: 8px 15px;
            background: #ff4444;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
          }
          .contact-card button:hover {
            background: #cc0000;
          }
          .empty {
            text-align: center;
            color: white;
            font-size: 18px;
            margin-top: 50px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>All Contacts (${rows.length})</h1>
          <a href="/">← Back to Form</a>
        </div>
        <div class="container">
          ${
            rows.length > 0
              ? contactsHTML
              : '<div class="empty">No contacts yet</div>'
          }
        </div>
        <script>
          async function deleteContact(id) {
            if (confirm('Are you sure you want to delete this contact?')) {
              try {
                const response = await fetch('/contacts/' + id, {
                  method: 'DELETE'
                });
                if (response.ok) {
                  location.reload();
                } else {
                  alert('Error deleting contact');
                }
              } catch (error) {
                alert('Error deleting contact');
              }
            }
          }
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).send("Error fetching contacts");
  }
});

// Delete contact
app.delete("/contacts/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM contacts WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Error deleting contact" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

// Install dependencies:
// npm install express mysql2
//
// Run with:
// nodemon app.js
