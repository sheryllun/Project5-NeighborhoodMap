function appViewModel() {
  var self = this;
  var map, city, infowindow;
  var grouponLocations = [];
  var grouponReadableNames = [];

  this.grouponDeals = ko.observableArray([]); //initial list of deals
  this.filteredList = ko.observableArray([]); //list filtered by search keyword
  this.mapMarkers = ko.observableArray([]);  //holds all map markers
  this.dealStatus = ko.observable('Searching for deals nearby...');
  this.searchStatus = ko.observable();
  this.searchLocation = ko.observable('Washington DC');
  this.loadImg = ko.observable();
  this.numDeals = ko.computed(function() {
    return self.filteredList().length;
  });

  //Holds value for list togglings
  this.toggleSymbol = ko.observable('hide');

  //Hold the current location's lat & lng - useful for re-centering map
  this.currentLat = ko.observable(38.906830);
  this.currentLng = ko.observable(-77.038599);

  // When a deal on the list is clicked, go to corresponding marker and open its info window.
  this.goToMarker = function(clickedDeal) {
    var clickedDealName = clickedDeal.dealName;
    for(var key in self.mapMarkers()) {
      if(clickedDealName === self.mapMarkers()[key].marker.title) {
        map.panTo(self.mapMarkers()[key].marker.position);
        map.setZoom(14);
        infowindow.setContent(self.mapMarkers()[key].content);
        infowindow.open(map, self.mapMarkers()[key].marker);
        map.panBy(0, -150);
        self.mobileShow(false);
        self.searchStatus('');
      }
    }
  };

  // Handle the input given when user searches for deals in a location
  this.processLocationSearch = function() {
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
        self.currentLat(grouponLocations.divisions[i].lat);
        self.currentLng(grouponLocations.divisions[i].lng);
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
      self.filteredList([]);
      self.dealStatus('Loading...');
      self.loadImg('<img src="img/ajax-loader.gif">');
      //perform new groupon search and center map to new location
      getGroupons(newGrouponId);
      map.panTo({lat: self.currentLat(), lng: self.currentLng()});
    }
  };


  this.filterKeyword = ko.observable('');

  //Compare search keyword against names and dealTags of existing deals.  Return a filtered list and map markers of request.

  this.filterResults = function() {
    var searchWord = self.filterKeyword().toLowerCase();
    var array = self.grouponDeals();
    if(!searchWord) {
      return;
    } else {
      //first clear out all entries in the filteredList array
      self.filteredList([]);
      //Loop through the grouponDeals array and see if the search keyword matches 
      //with any venue name or dealTags in the list, if so push that object to the filteredList 
      //array and place the marker on the map.
      for(var i=0; i < array.length; i++) {
        if(array[i].dealName.toLowerCase().indexOf(searchWord) != -1) {
          self.mapMarkers()[i].marker.setMap(map);
          self.filteredList.push(array[i]);
        } else{
          for(var j = 0; j < array[i].dealTags.length; j++) {
            if(array[i].dealTags[j].name.toLowerCase().indexOf(searchWord) != -1) {
              self.mapMarkers()[i].marker.setMap(map);
              self.filteredList.push(array[i]);
          //otherwise hide all other markers from the map
          } else {
              self.mapMarkers()[i].marker.setMap(null);
            }
          }
          self.dealStatus(self.numDeals() + ' deals found for ' + self.filterKeyword());
        }
      }
    }
  };

  //Clear keyword from filter and show all deals in current location again.
  this.clearFilter = function() {
    self.filteredList(self.grouponDeals());
    self.dealStatus(self.numDeals() + ' food and drink deals found near ' + self.searchLocation());
    self.filterKeyword('');
    for(var i = 0; i < self.mapMarkers().length; i++) {
      self.mapMarkers()[i].marker.setMap(map);
    }
  };

  //toggles the list view
  this.listToggle = function() {
    if(self.toggleSymbol() === 'hide') {
      self.toggleSymbol('show');
    } else {
      self.toggleSymbol('hide');
    }
  };

  //Error handling if Google Maps fails to load
  this.mapRequestTimeout = setTimeout(function() {
    $('#map-canvas').html('We had trouble loading Google Maps. Please refresh your browser and try again.');
  }, 8000);

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
          mapTypeControl: false,
          panControl: false
        });
    clearTimeout(self.mapRequestTimeout);

    google.maps.event.addDomListener(window, "resize", function() {
       var center = map.getCenter();
       google.maps.event.trigger(map, "resize");
       map.setCenter(center); 
    });

    infowindow = new google.maps.InfoWindow({maxWidth: 300});
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

            //this line filters out deals that don't have a physical location to redeem
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
              shortBlurb = data.deals[i].announcementTitle,
              tags = data.deals[i].tags;

          // Some venues have a Yelp rating included. If there is no rating, 
          //function will stop running because the variable is undefined. 
          //This if statement handles that scenario by setting rating to an empty string.
          var rating;
          if((data.deals[i].merchant.ratings == null) || data.deals[i].merchant.ratings[0] === undefined ) { rating = '';
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
            dealRating: rating,
            dealTags: tags
          });

        }
        self.filteredList(self.grouponDeals());
        mapMarkers(self.grouponDeals());
        self.searchStatus('');
        self.loadImg('');
      },
      error: function() {
        self.dealStatus('Oops, something went wrong, please refresh and try again.');
        self.loadImg('');
      }
    });
  }

// Create and place markers and info windows on the map based on data from API
  function mapMarkers(array) {
    $.each(array, function(index, value) {
      var latitude = value.dealLat,
          longitude = value.dealLon,
          geoLoc = new google.maps.LatLng(latitude, longitude),
          thisRestaurant = value.dealName;

      var contentString = '<div id="infowindow">' +
      '<img src="' + value.dealImg + '">' +
      '<h2>' + value.dealName + '</h2>' +
      '<p>' + value.dealAddress + '</p>' +
      '<p class="rating">' + value.dealRating + '</p>' +
      '<p><a href="' + value.dealLink + '" target="_blank">Click to view deal</a></p>' +
      '<p>' + value.dealBlurb + '</p></div>';

      var marker = new google.maps.Marker({
        position: geoLoc,
        title: thisRestaurant,
        map: map
      });

      self.mapMarkers.push({marker: marker, content: contentString});

      self.dealStatus(self.numDeals() + ' food and drink deals found near ' + self.searchLocation());

      //generate infowindows for each deal
      google.maps.event.addListener(marker, 'click', function() {
        self.searchStatus('');
         infowindow.setContent(contentString);
         map.setZoom(14);
         map.setCenter(marker.position);
         infowindow.open(map, marker);
         map.panBy(0, -150);
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

// Groupon's deal locations have a separate ID than the human-readable name 
//(eg washington-dc instead of Washington DC). This ajax call uses the Groupon 
//Division API to pull a list of IDs and their corresponding names to use for 
//validation in the search bar.

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


  //Manages the toggling of the list view, location centering, and search bar on a mobile device.

  this.mobileShow = ko.observable(false);
  this.searchBarShow = ko.observable(true);

   this.mobileToggleList = function() {
    if(self.mobileShow() === false) {
      self.mobileShow(true);
    } else {
      self.mobileShow(false);
    }
  };

  this.searchToggle = function() {
    if(self.searchBarShow() === true) {
      self.searchBarShow(false);
    } else {
      self.searchBarShow(true);
    }
  };

  //Re-center map to current city if you're viewing deals that are further away
  this.centerMap = function() {
    infowindow.close();
    var currCenter = map.getCenter();
    var cityCenter = new google.maps.LatLng(self.currentLat(), self.currentLng());
    if((cityCenter.k == currCenter.A) && (cityCenter.D == currCenter.F)) {
        self.searchStatus('Map is already centered.');
    } else {
      self.searchStatus('');
      map.panTo(cityCenter);
      map.setZoom(10);
    }
  };

  mapInitialize();
}

//custom binding highlights the search text on focus

ko.bindingHandlers.selectOnFocus = {
        update: function (element) {
          ko.utils.registerEventHandler(element, 'focus', function (e) {
            element.select();
          });
        }
      };

ko.applyBindings(new appViewModel());