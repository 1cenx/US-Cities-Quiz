from app.data.cities import cities as city_data


class City:
    def __init__(self, name, latitude, longitude):
        self.name = name
        self.latitude = latitude
        self.longitude = longitude

cities = [
    City(city["name"], city["latitude"], city["longitude"])
    for city in city_data
]