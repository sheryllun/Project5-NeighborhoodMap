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
}

google.maps.event.addDomListener(window, 'load', initialize);

// function GrouponDeals(deal, address, city) {
//   this.deal = deal;
//   this.address = address;
//   this.city = city;
// }

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
      var venueAddress = venueLocation.streetAddress1;
      var venueCity = venueLocation.city;
      grouponDeals.push({dealName: venueName, dealAddress: venueAddress, dealCity: venueCity, geolocation: 0});
    }
    var geoUrl = "https://maps.googleapis.com/maps/api/geocode/json?address=" + grouponDeals[0].dealAddress + ",+" + grouponDeals[0].dealCity + "&key=AIzaSyCVzYqt4JIDK3C_xMQcNssaEKeDUxf45aA";
    console.log(geoUrl);
    $.ajax({
      url: geoUrl,
      dataType: 'json',
      success: function(data) {
        console.log(data);
      }
    });
  }
});




