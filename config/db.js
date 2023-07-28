const { DB_HOST, DB_USERNAME, DB_PASSWORD, DB_NAME } = process.env;

const mysql = require('mysql');

const connection = mysql.createConnection({
  host: DB_HOST,
  user: DB_USERNAME,
  password: DB_PASSWORD,
  database: DB_NAME,
});

// Name of the database to be created
const dbName = 'koboweb';

// SQL queries to create the database and tables
const createDatabaseQuery = `CREATE DATABASE IF NOT EXISTS ${dbName}`;
const createUsersTableQuery = `
  CREATE TABLE IF NOT EXISTS ${dbName}.users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255),
    password VARCHAR(255),
    token VARCHAR(255),
    is_admin INT,
    is_verified INT,
    last_login DATE,
    qrCode TEXT,
    secret_key VARCHAR(255),
    created_at DATE,
    updated_at DATE
  )
`;
const createPasswordResetsTableQuery = `
  CREATE TABLE IF NOT EXISTS ${dbName}.password_resets (
    email VARCHAR(255),
    token VARCHAR(255),
    created_at DATE
  )
`;

// Connect to the MySQL server
connection.connect((error) => {
  if (error) {
    console.error('Error connecting to the MySQL server:', error);
    return;
  }
  console.log('Connected to the MySQL server');

  // Create the koboweb database
  connection.query(createDatabaseQuery, (dbError) => {
    if (dbError) {
      console.error('Error creating the database:', dbError);
      connection.end();
      return;
    }

    console.log(`Database ${dbName} created or already exists`);

    // Use the koboweb database for the subsequent queries
    connection.query(`USE ${dbName}`, (useDbError) => {
      if (useDbError) {
        console.error('Error using the database:', useDbError);
        connection.end();
        return;
      }

      // Create the users table
      connection.query(createUsersTableQuery, (usersTableError) => {
        if (usersTableError) {
          console.error('Error creating the users table:', usersTableError);
          connection.end();
          return;
        }

        console.log('Users table created or already exists');

        // Create the password_resets table
        connection.query(
          createPasswordResetsTableQuery,
          (passwordResetsTableError) => {
            if (passwordResetsTableError) {
              console.error(
                'Error creating the password_resets table:',
                passwordResetsTableError
              );
              connection.end();
              return;
            }

            console.log('password_resets table created or already exists');
          }
        );
      });
    });
  });
});

module.exports = connection;
