QUIZ_LENGTH = 36
CITY_TOLERANCE_MILES = 50

city_coordinates = {
    "Atlanta": {"latitude": 33.7490, "longitude": -84.3880},
    "Baltimore": {"latitude": 39.2904, "longitude": -76.6122},
    "Boston": {"latitude": 42.3601, "longitude": -71.0589},
    "Buffalo": {"latitude": 42.8864, "longitude": -78.8784},
    "Charleston": {"latitude": 32.7765, "longitude": -79.9311},
    "Chicago": {"latitude": 41.8781, "longitude": -87.6298},
    "Cincinnati": {"latitude": 39.1031, "longitude": -84.5120},
    "Cleveland": {"latitude": 41.4993, "longitude": -81.6944},
    "Dallas-Ft. Worth": {"latitude": 32.8998, "longitude": -97.0403},
    "Denver": {"latitude": 39.7392, "longitude": -104.9903},
    "Detroit": {"latitude": 42.3314, "longitude": -83.0458},
    "Houston": {"latitude": 29.7604, "longitude": -95.3698},
    "Kansas City": {"latitude": 39.0997, "longitude": -94.5786},
    "Little Rock": {"latitude": 34.7465, "longitude": -92.2896},
    "Los Angeles": {"latitude": 34.0522, "longitude": -118.2437},
    "Miami": {"latitude": 25.7617, "longitude": -80.1918},
    "Milwaukee": {"latitude": 43.0389, "longitude": -87.9065},
    "Minneapolis-St. Paul": {"latitude": 44.9537, "longitude": -93.09},
    "Montgomery": {"latitude": 32.3668, "longitude": -86.3000},
    "Nashville": {"latitude": 36.1627, "longitude": -86.7816},
    "New Orleans": {"latitude": 29.9511, "longitude": -90.0715},
    "New York": {"latitude": 40.7128, "longitude": -74.0060},
    "Oklahoma City": {"latitude": 35.4676, "longitude": -97.5164},
    "Philadelphia": {"latitude": 39.9526, "longitude": -75.1652},
    "Phoenix": {"latitude": 33.4484, "longitude": -112.0740},
    "Pittsburgh": {"latitude": 40.4406, "longitude": -79.9959},
    "Portland": {"latitude": 45.5152, "longitude": -122.6784},
    "Richmond": {"latitude": 37.5407, "longitude": -77.4360},
    "Salt Lake City": {"latitude": 40.7608, "longitude": -111.8910},
    "San Antonio": {"latitude": 29.4241, "longitude": -98.4936},
    "San Diego": {"latitude": 32.7157, "longitude": -117.1611},
    "San Francisco": {"latitude": 37.7749, "longitude": -122.4194},
    "Santa Fe": {"latitude": 35.6870, "longitude": -105.9378},
    "Seattle": {"latitude": 47.6062, "longitude": -122.3321},
    "St. Louis": {"latitude": 38.6270, "longitude": -90.1994},
    "Washington, D.C.": {"latitude": 38.9072, "longitude": -77.0369},
}

city_states = {
    "Atlanta": "GA", "Baltimore": "MD", "Boston": "MA", "Buffalo": "NY",
    "Charleston": "SC", "Chicago": "IL", "Cincinnati": "OH", "Cleveland": "OH",
    "Dallas-Ft. Worth": "TX", "Denver": "CO", "Detroit": "MI", "Houston": "TX",
    "Kansas City": "MO", "Little Rock": "AR", "Los Angeles": "CA", "Miami": "FL",
    "Milwaukee": "WI", "Minneapolis-St. Paul": "MN", "Montgomery": "AL", "Nashville": "TN",
    "New Orleans": "LA", "New York": "NY", "Oklahoma City": "OK", "Philadelphia": "PA",
    "Phoenix": "AZ", "Pittsburgh": "PA", "Portland": "OR", "Richmond": "VA",
    "Salt Lake City": "UT", "San Antonio": "TX", "San Diego": "CA", "San Francisco": "CA",
    "Santa Fe": "NM", "Seattle": "WA", "St. Louis": "MO", "Washington, D.C.": "DC",
}

cities = [
    {
        "name": name,
        "latitude": coordinates["latitude"],
        "longitude": coordinates["longitude"],
        "state": city_states[name],
    }
    for name, coordinates in city_coordinates.items()
]