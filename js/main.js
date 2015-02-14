function initialize() {
  var myLatLng = new google.maps.LatLng(38.906830, -77.038599);
  var mapOptions = {
    center: myLatLng,
    zoom: 12
  };
  var map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);

  var marker = new google.maps.Marker({
  position: myLatLng,
  title: "hello",
  map: map
  });

  var infoWindow = new google.maps.InfoWindow({
    content: "Our nation's capital!"
  });

  google.maps.event.addListener(marker, 'click', function() {
    infoWindow.open(map, marker);
  });

  getGroupons();

}

google.maps.event.addDomListener(window, 'load', initialize);

function getGroupons() {
  var grouponUrl = "https://partner-api.groupon.com/deals.json?tsToken=afc14db65a41970c883ef994628f8dc96a743462&division_id=washington-dc&filters=category:food-and-drink&offset=0&limit=15";

  var grouponDeals = [];

  $.ajax({
    url: grouponUrl,
    dataType: 'jsonp',
    success: function(data) {
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

function mapMarkers(array) {
  $.each(array, function(index, value) {
    var geoLocation = new google.maps.LatLng(array[index].dealLat + ", " + array[index].dealLon);
    var thisRestaurant = array[index].dealName;
    var marker = new google.maps.Marker({
      position: geoLocation,
      title: thisRestaurant,
      map: map
    });
  });
}

