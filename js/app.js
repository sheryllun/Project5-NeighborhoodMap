function appViewModel() {
  var self = this;
  var map, city;

// Initialize Google map
  function initialize() {
    city = new google.maps.LatLng(38.906830, -77.038599);
    map = new google.maps.Map(document.getElementById('map-canvas'), {
          center: city,
          zoom: 14
        });
    getGroupons();
  }

// Use API to get locations and deals, store info in an array
  function getGroupons() {
    var grouponUrl = "https://partner-api.groupon.com/deals.json?tsToken=afc14db65a41970c883ef994628f8dc96a743462&division_id=washington-dc&filters=category:food-and-drink&offset=0&limit=15";

    var grouponDeals = [];

    $.ajax({
      url: grouponUrl,
      dataType: 'jsonp',
      success: function(data) {
        console.log(data);
        for(var i = 0; i < 15; i++) {
          var venueLocation = data.deals[i].options[0].redemptionLocations[0];
            if (venueLocation === undefined) continue;
          var venueName = data.deals[i].merchant.name;
          var actualDeal = data.deals[i].announcementTitle;
          var venueLat = venueLocation.lat;
          var venueLon = venueLocation.lng;
          grouponDeals.push({dealName: venueName, dealLat: venueLat, dealLon: venueLon, dealDeal: actualDeal});
          }
        mapMarkers(grouponDeals);
      }
    });
  }

// Create and place markers on the map based on data from API
  function mapMarkers(array) {
    $.each(array, function(index, value) {
      var latitude = array[index].dealLat;
      var longitude = array[index].dealLon;
      var geoLocation = new google.maps.LatLng(latitude, longitude);
      var thisRestaurant = array[index].dealName;
      var marker = new google.maps.Marker({
        position: geoLocation,
        title: thisRestaurant,
        map: map
      });
    });
  }

  initialize();
}

ko.applyBindings(new appViewModel());