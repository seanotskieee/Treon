from flask import Flask, render_template, Response
from lip import generate_frames, set_color, capture_frame

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/tryon')
def tryon():
    return render_template('tryon.html')

@app.route('/privacy')
def privacy():
    return render_template('privacy.html')

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/set_color/<int:color_id>')
def set_color_route(color_id):
    set_color(color_id)
    return ('', 204)

@app.route('/capture')
def capture_route():
    capture_frame()
    return '✅ Image captured!'

if __name__ == '__main__':
    app.run(debug=True)