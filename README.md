# Seterra Geography Quiz

This is a Flask-based web application that provides a geography quiz focused on 36 specific cities in the United States. The application allows users to test their knowledge of U.S. geography in an interactive and engaging way.

## Features

- Quiz on 36 U.S. cities
- Interactive map for city selection
- Scoring system to track performance
- Responsive design for various devices

## Project Structure

```
seterra-geography-quiz
├── app
│   ├── __init__.py
│   ├── config.py
│   ├── data
│   │   └── cities.py
│   ├── models.py
│   ├── routes.py
│   ├── services
│   │   └── quiz_service.py
│   ├── static
│   │   ├── css
│   │   │   └── style.css
│   │   └── js
│   │       └── app.js
│   ├── templates
│   │   ├── base.html
│   │   ├── index.html
│   │   ├── quiz.html
│   │   └── results.html
│   └── utils.py
├── tests
│   └── test_quiz.py
├── .gitignore
├── README.md
├── requirements.txt
├── run.py
└── .env.example
```

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/seterra-geography-quiz.git
   cd seterra-geography-quiz
   ```

2. Create a virtual environment:
   ```
   python -m venv venv
   ```

3. Activate the virtual environment:
   - On Windows:
     ```
     venv\Scripts\activate
     ```
   - On macOS/Linux:
     ```
     source venv/bin/activate
     ```

4. Install the required packages:
   ```
   pip install -r requirements.txt
   ```

## Running the Application

To run the application locally, use the following command:
```
python run.py
```

The application will be accessible at `http://127.0.0.1:5000`.

## Public Hosting

The local address above is only reachable from the computer running the app. To create a public link:

1. Push this project to a GitHub repository.
2. In Render, choose **New** > **Blueprint** and connect that repository.
3. Render reads `render.yaml`; review the settings and create the service.
4. When the deploy finishes, share the service's `https://...onrender.com` URL.

The Render configuration installs `requirements.txt`, runs the app with Gunicorn, disables Flask debug mode, and generates a production secret key. On Render's free plan, the service may spin down when idle, so its first visit after a pause can take a little longer.

## Usage

- Navigate to the home page to start the quiz.
- Follow the prompts to answer questions about the cities.
- View your results at the end of the quiz.

## Contributing

Feel free to submit issues or pull requests if you have suggestions or improvements for the project.

## License

This project is licensed under the MIT License. See the LICENSE file for details.