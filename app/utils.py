def calculate_distance(coord1, coord2):
    from math import radians, sin, cos, sqrt, atan2

    # Haversine formula to calculate the distance between two points on the Earth
    R = 6371.0  # Radius of the Earth in kilometers
    lat1, lon1 = radians(coord1[0]), radians(coord1[1])
    lat2, lon2 = radians(coord2[0]), radians(coord2[1])

    dlon = lon2 - lon1
    dlat = lat2 - lat1

    a = sin(dlat / 2)**2 + cos(lat1) * cos(lat2) * sin(dlon / 2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    distance = R * c
    return distance

def format_city_name(city_name):
    return city_name.title()  # Capitalizes the first letter of each word in the city name

def get_random_cities(cities, count=5):
    import random
    return random.sample(cities, count)  # Returns a random sample of cities from the list