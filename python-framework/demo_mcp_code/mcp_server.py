
# Demo MCP Server Python Code mit Fehlern
from flask import Flask, jsonify
import json

app = Flask(__name__)

def calculate_average(numbers):
    # Fehler: Division durch Null möglich
    return sum(numbers) / len(numbers)

def process_user_data(user_data):
    # Fehler: Null-Check fehlt
    return user_data.get('name').upper()

@app.route('/api/data')
def get_data():
    try:
        # Fehler: undefined_variable
        return jsonify({'result': undefined_result})
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/health')
def health():
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
