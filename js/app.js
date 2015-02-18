function appViewModel() {
  var self = this;
  var map, city, infowindow;
  var grouponLocations = [];
  var grouponReadableNames = [];

  this.grouponDeals = ko.observableArray([]);
  this.mapMarkers = ko.observableArray([]);
  this.dealStatus = ko.observable('Searching for deals nearby...');
  this.searchStatus = ko.observable();
  this.searchLocation = ko.observable('Washington DC');
  this.loadImg = ko.observable();
  this.numDeals = ko.computed(function() {
    return self.grouponDeals().length;
  });
  this.toggleSymbol = ko.observable('hide');

  // When a deal on the list is clicked, go to corresponding marker and open its info window.
  this.goToMarker = function(clickedDeal) {
    var clickedDealName = clickedDeal.dealName;
    for(var key in self.mapMarkers()) {
      if(clickedDealName === self.mapMarkers()[key].marker.title) {
        map.panTo(self.mapMarkers()[key].marker.position);
        map.setZoom(14);
        infowindow.setContent(self.mapMarkers()[key].content);
        infowindow.open(map, self.mapMarkers()[key].marker);
      }
    }
  };

  // Handle the input given when user searches for deals in a location
  this.processSearch = function() {
    //Need to use a jQuery selector instead of KO binding because this field is affected by the autocomplete plugin.  The value inputted does not seem to register via KO.
    self.searchStatus('');
    self.searchStatus('Searching...');
    var newAddress = $('#autocomplete').val();

    //newGrouponId will hold the Groupon-formatted ID of the inputted city.
    var newGrouponId, newLat, newLng;
    for(var i = 0; i < 171; i++) {
      var name = grouponLocations.divisions[i].name;
      if(newAddress == name) {
        newGrouponId = grouponLocations.divisions[i].id;
        newLat = grouponLocations.divisions[i].lat;
        newLng = grouponLocations.divisions[i].lng;
      } 
    }

    //Form validation - if user enters an invalid location, return error.
    if(!newGrouponId) {
      return self.searchStatus('Not a valid location, try again.');
    } else {
      //Replace current location with new (human-formatted) location for display in other KO bindings.
      self.searchLocation(newAddress);

      //clear our current deal and marker arrays
      clearMarkers();
      self.grouponDeals([]);
      self.dealStatus('Loading...');
      self.loadImg('<img src="img/ajax-loader.gif">');
      //perform new groupon search and center map to new location
      getGroupons(newGrouponId);
      map.panTo({lat: newLat, lng: newLng});
    }
  };

  this.listToggle = function() {
    if(self.toggleSymbol() === 'hide') {
      self.toggleSymbol('show');
    } else {
      self.toggleSymbol('hide');
    }
  };

// Initialize Google map, perform initial deal search on a city.
  function mapInitialize() {
    city = new google.maps.LatLng(38.906830, -77.038599);
    map = new google.maps.Map(document.getElementById('map-canvas'), {
          center: city,
          zoom: 10,
          zoomControlOptions: {
            position: google.maps.ControlPosition.LEFT_CENTER,
            style: google.maps.ZoomControlStyle.SMALL
          },
          streetViewControlOptions: {
            position: google.maps.ControlPosition.LEFT_BOTTOM
            },
          panControl: false
        });

    google.maps.event.addDomListener(window, "resize", function() {
       var center = map.getCenter();
       google.maps.event.trigger(map, "resize");
       map.setCenter(center); 
    });

    infowindow = new google.maps.InfoWindow({maxWidth: 400});
    getGroupons('washington-dc');
    getGrouponLocations();
  }

// Use API to get deal data and store the info as objects in an array
  function getGroupons(location) {
    var grouponUrl = "https://partner-api.groupon.com/deals.json?tsToken=US_AFF_0_203644_212556_0&filters=category:food-and-drink&limit=30&offset=0&division_id=";

    var divId = location;

    $.ajax({
      url: grouponUrl + divId,
      dataType: 'jsonp',
      success: function(data) {
        console.log(data);
        var len = data.deals.length;
        for(var i = 0; i < len; i++) {
          var venueLocation = data.deals[i].options[0].redemptionLocations[0];
            if (data.deals[i].options[0].redemptionLocations[0] === undefined) continue;
          var venueName = data.deals[i].merchant.name;
              venueLat = venueLocation.lat,
              venueLon = venueLocation.lng,
              gLink = data.deals[i].dealUrl,
              gImg = data.deals[i].mediumImageUrl,
              blurb = data.deals[i].pitchHtml,
              address = venueLocation.streetAddress1,
              city = venueLocation.city,
              state = venueLocation.state,
              zip = venueLocation.postalCode,
              shortBlurb = data.deals[i].announcementTitle;

          // Some venues have a Yelp rating included. If there is no rating, function will stop executing because the variable is undefined. This if statement handles that error.
          var rating;

          if(data.deals[i].merchant.ratings[0] === undefined) { rating = '';
          } else {
            var num = data.deals[i].merchant.ratings[0].rating;
            var decimal = num.toFixed(1);
            rating = '<img src="img/burst_tiny.png"> ' + decimal + ' <span>out of 5</span>';
          }

          self.grouponDeals.push({
            dealName: venueName, 
            dealLat: venueLat, 
            dealLon: venueLon, 
            dealLink: gLink, 
            dealImg: gImg, 
            dealBlurb: blurb,
            dealAddress: address + "<br>" + city + ", " + state + " " + zip,
            dealShortBlurb: shortBlurb,
            dealRating: rating
          });
        }
        mapMarkers(self.grouponDeals());
        self.searchStatus('');
        self.loadImg('');
      },
      error: function() {
        self.dealStatus('Oops, something went wrong, please try again.');
        self.loadImg('');
      }
    });
  }

// Create and place markers and info windows on the map based on data from API
  function mapMarkers(array) {
    $.each(array, function(index, value) {
      var latitude = array[index].dealLat;
      var longitude = array[index].dealLon;
      var geoLoc = new google.maps.LatLng(latitude, longitude);
      var thisRestaurant = array[index].dealName;

      var contentString = '<div id="infowindow">' +
      '<img src="' + array[index].dealImg + '">' +
      '<h2>' + array[index].dealName + '</h2>' +
      '<p>' + array[index].dealAddress + '</p>' +
      '<p><a href="' + array[index].dealLink + '" target="_blank">Click to view deal</a></p>' +
      '<p>' + array[index].dealBlurb + '</p></div>';

      var marker = new google.maps.Marker({
        position: geoLoc,
        title: thisRestaurant,
        map: map
      });

      self.mapMarkers.push({marker: marker, content: contentString});

      self.dealStatus(self.numDeals() + ' food and drink deals found near ' + self.searchLocation());

      //generate infowindows for each deal
      google.maps.event.addListener(marker, 'click', function() {
         infowindow.setContent(contentString);
         map.setZoom(14);
         map.setCenter(marker.position);
         infowindow.open(map, marker);
         console.log(self.grouponDeals());
         console.log(self.mapMarkers());
         console.log(grouponLocations);
       });
    });
  }

// Clear markers from map and array
  function clearMarkers() {
    $.each(self.mapMarkers(), function(key, value) {
      value.marker.setMap(null);
    });
    self.mapMarkers([]);
  }

// Groupon's deal locations have a separate ID than the human-readable name (eg washington-dc instead of Washington DC). This ajax call uses the Groupon Division API to pull a list of IDs and their corresponding names to use for validation in the search bar.

  function getGrouponLocations() {
    $.ajax({
      url: 'https://partner-api.groupon.com/division.json',
      dataType: 'jsonp',
      success: function(data) {
        grouponLocations = data;
        for(var i = 0; i < 171; i++) {
          var readableName = data.divisions[i].name;
          grouponReadableNames.push(readableName);
        }

        $('#autocomplete').autocomplete({
          lookup: grouponReadableNames,
          showNoSuggestionNotice: true,
          noSuggestionNotice: 'Sorry, no matching results',
        });
      },
      error: function() {
        self.dealStatus('Oops, something went wrong, please reload the page and try again.');
        self.loadImg('');
      }
    });
  }

  this.mobileShow = ko.observable(false);

   this.mobileOpenList = function() {
    self.mobileShow(true);
  }

  mapInitialize();

}


ko.applyBindings(new appViewModel());