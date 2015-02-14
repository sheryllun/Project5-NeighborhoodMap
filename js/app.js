function appViewModel() {
  var self = this;
  var map, city, infowindow;

// Initialize Google map
  function mapInitialize() {
    city = new google.maps.LatLng(38.906830, -77.038599);
    map = new google.maps.Map(document.getElementById('map-canvas'), {
          center: city,
          zoom: 14
        });
    infowindow = new google.maps.InfoWindow();
    getGroupons();
  }

// Use API to get locations and deals, store info in an array
  function getGroupons() {
    var grouponUrl = "https://partner-api.groupon.com/deals.json?tsToken=US_AFF_0_203644_212556_0&division_id=washington-dc&filters=category:food-and-drink&offset=0&radius=10&limit=20";

    var grouponDeals = [];

    $.ajax({
      url: grouponUrl,
      dataType: 'jsonp',
      success: function(data) {
        console.log(data);
        for(var i = 0; i < 20; i++) {
          var venueLocation = data.deals[i].options[0].redemptionLocations[0];
            if (venueLocation === undefined) continue;
          var venueName = data.deals[i].merchant.name;
              venueLat = venueLocation.lat,
              venueLon = venueLocation.lng,
              gLink = data.deals[i].dealUrl,
              gImg = data.deals[i].mediumImageUrl,
              blurb = data.deals[i].pitchHtml,
              address = venueLocation.streetAddress1,
              city = venueLocation.city,
              state = venueLocation.state,
              zip = venueLocation.postalCode;

          grouponDeals.push({
                              dealName: venueName, 
                              dealLat: venueLat, 
                              dealLon: venueLon, 
                              dealLink: gLink, 
                              dealImg: gImg, 
                              dealBlurb: blurb,
                              dealAddress: address + "<br>" + city + ", " + state + " " + zip
                            });
          }
        mapMarkers(grouponDeals);
      }
    });
  }

// Create and place markers and info windows on the map based on data from API
  function mapMarkers(array) {
    $.each(array, function(index, value) {
      var latitude = array[index].dealLat;
      var longitude = array[index].dealLon;
      var geoLocation = new google.maps.LatLng(latitude, longitude);
      var thisRestaurant = array[index].dealName;

      var contentString = '<div id="infowindow">' +
      '<img src="' + array[index].dealImg + '">' +
      '<h2>' + array[index].dealName + '</h2>' +
      '<p>' + array[index].dealAddress + '</p>' +
      '<p><a href="' + array[index].dealLink + '" target="_blank">Click to view deal</a></p>' +
      '<p>' + array[index].dealBlurb + '</p></div>';

      var marker = new google.maps.Marker({
        position: geoLocation,
        title: thisRestaurant,
        map: map
      });

      google.maps.event.addListener(marker, 'click', function() {
         infowindow.setContent(contentString);
         infowindow.open(map, marker);
       });
    });
  }

  mapInitialize();

}

ko.applyBindings(new appViewModel());