import requests
url = "http://a.62-us.com/api/get_sms?key=aff34f8188d5705485ca948eefe5a6b1"

response = requests.get(url)
print(response.text)