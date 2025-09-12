from flask import Flask, Response, send_from_directory, render_template
from lip import generate_frames, set_color, capture_frame

app = Flask(__name__, static_folder='.', template_folder='.')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/set_color/<int:color_id>')
def set_color_route(color_id):
    set_color(color_id)
    return ('', 204)

@app.route('/capture')
def capture_route():
    capture_frame()
    return '✅ Image captured!'

@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('.', filename)

if __name__ == '__main__':
    app.run(debug=True)
