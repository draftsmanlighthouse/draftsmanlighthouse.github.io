import traceback
import uuid
from flask import Flask, render_template, request, jsonify
import boto3, os

app = Flask(__name__)

REGION = "eu-west-2"
chime = boto3.client("chime-sdk-meetings", region_name=REGION)

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/create-meeting", methods=["POST"])
def create_meeting():
    data = request.get_json()
    name = data.get("name", "Anon")

    try:
        meeting = chime.create_meeting(
            ClientRequestToken=str(uuid.uuid4()),      # ✅ nieuwe naam
            ExternalMeetingId="demo-meeting",          # ✅ verplicht veld (max 64 tekens)
            MediaRegion=REGION
        )["Meeting"]

        attendee = chime.create_attendee(
            MeetingId=meeting["MeetingId"],
            ExternalUserId=name
        )["Attendee"]
        print(meeting)
        print(attendee)
        return jsonify({
            "success": True,
            "meeting": meeting,
            "attendee": attendee
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route("/api/join-meeting", methods=["POST"])
def join_meeting():
    data = request.get_json()
    meeting_id = data.get("meetingId")
    name = data.get("name", "Anon")
    try:
        attendee = chime.create_attendee(MeetingId=meeting_id, ExternalUserId=name)["Attendee"]
        return jsonify({"success": True, "attendee": attendee})
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"success": False, "error": str(e)})

if __name__ == "__main__":
    app.run(debug=True)