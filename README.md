# mcServerManager
A web application built with Flask that allows users to create, manage, and monitor Minecraft game servers effortlessly. This application provides a user-friendly interface to start, stop, delete, and backup Minecraft servers, as well as manage user authentication and server configurations.

## Features
- **User Authentication:** Secure login system with admin and regular users.
- **Server Management:** Create, start, stop, delete, and backup Minecraft servers.
- **Version Selection:** Select from available Minecraft versions (excluding those without server downloads).
- **EULA Acceptance:** Integrated EULA acceptance process within the app.
- **Dynamic Port Allocation:** Automatically assigns available ports for new servers.
- **Server Configuration:** Customize server properties like game mode, difficulty, and more.
- **Modular Architecture:** Organized using Flask blueprints for scalability and maintainability.

## Prerequisites
- Python 3.7 or higher
- Java 8 or higher (Required to run Minecraft servers)

## Installation
**Clone the Repository**
  ```
  git clone https://github.com/yourusername/minecraft-server-manager.git
  ```
  ```
  cd minecraft-server-manager
  ```
***Configure Environment Variables***
Create an ```.env``` file in the root directory to store enviroment variables.
```
SECRET_KEY=your_secret_key
ADMIN_USERNAME=admin
DATABASE_URL=sqlite:///minecraft_manager.db
```
  *SECRET_KEY:* Replace your_secret_key with a secure, randomly generated key.

  *ADMIN_USERNAME:* Default is admin. Change if desired.

  *DATABASE_URL:* Database connection string. Default uses SQLite.


***Run the Application***
```
bash ./start.sh
```

## License
This project is licensed under the MIT License. See the LICENSE file for details.

*Disclaimer: This application is not affiliated with or endorsed by Mojang Studios or Microsoft Corporation. Minecraft is a trademark of Mojang Studios.*
