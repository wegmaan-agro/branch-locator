import maplibregl, { Map, Marker, NavigationControl, Popup } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import MapLibreGlDirections, { LoadingIndicatorControl } from "@maplibre/maplibre-gl-directions";
import tci_branches from '../tci_branches.json' assert { type: 'json' };

// Initialize map
const map = new Map({
  style: 'https://tiles.openfreemap.org/styles/liberty',
  /* style: {
    version: 8,
    sources: {
      "osm-tiles": {
        type: "raster",
        tiles: [
          "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
          "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
          "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
    },
    layers: [
      {
        id: "osm-tiles",
        type: "raster",
        source: "osm-tiles",
        minzoom: 0,
        maxzoom: 19,
      },
    ],
  }, */
  center: [78.9629, 20.5937],
  zoom: 3.5,
  container: "map",
  attributionControl: false,
});

let directions = null;

let nav = new NavigationControl({ showCompass: false });
map.addControl(nav, 'bottom-left');

map.touchZoomRotate.disableRotation();

let searchResultMarker = new Marker()
let distanceToBranch = 0

//let tci_branches = [];

map.on("load", () => {
  addTCIBranchesToMap();

});

// Routing
map.on('load', () => {
  directions = new MapLibreGlDirections(map);

  directions.on("fetchroutesend", (ev) => {
    distanceToBranch = (ev.data?.routes[0].distance / 1000).toFixed(0)
    document.querySelector('.distance-container').innerText = `Approximate distance : ${distanceToBranch} km.`
    //console.log(document.querySelector('.distance-container'))
  });
})

map.on("click", "branch-markers", (e) => {
  const feature = e.features[0];
  const popupContent = `
                <strong>${feature.properties.name} (${feature.properties.code})</strong><br>
                ${feature.properties.address}, ${feature.properties.city}, ${feature.properties.state} - ${feature.properties.pincode}
            `;


  new Popup({ offset: 10, closeButton: false })
    .setLngLat(feature.geometry.coordinates)
    .setHTML(popupContent)
    .addTo(map);
});

// Change cursor on hover
map.on("mouseenter", "branch-markers", () => {
  map.getCanvas().style.cursor = "pointer";
});

map.on("mouseleave", "branch-markers", () => {
  map.getCanvas().style.cursor = "";
});

// Haversine formula to calculate distance between two coordinates
function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Search function to find the nearest branch
function searchNearestBranch(center) {
  const userLocation = { lat: center[1], lon: center[0] };
  let nearestBranch = null;
  let minDistance = Infinity;

  tci_branches.forEach((branch) => {
    const distance = haversineDistance(
      userLocation.lat,
      userLocation.lon,
      branch.lat,
      branch.lon
    );
    if (distance < minDistance) {
      minDistance = distance;
      nearestBranch = branch;
    }
  });


  
  if (nearestBranch) {

    directions.setWaypoints([
      [center[0], center[1]],
      [nearestBranch.lon, nearestBranch.lat]
    ]);

    const routeCenter = [
      (parseFloat(center[0]) + parseFloat(nearestBranch.lon)) / 2,
      (parseFloat(center[1]) + parseFloat(nearestBranch.lat)) / 2
    ]
    console.log(routeCenter)

    /* map.flyTo({
      center: routeCenter,
      essential: true,
      zoom: 12
    }); */

    const bounds = [
      [center[0], center[1]],
      [nearestBranch.lon, nearestBranch.lat]
    ]
    bounds.sort((a, b) => a[0] - b[0])

    map.fitBounds(bounds, { linear : false, essential : true, padding : 100 })

    console.log(center[0], nearestBranch.lon)

    document.getElementById(
      "nearest-branches-list"
    ).innerHTML = `<div class="branch-item font-sans font-medium">
            <table class="w-full p-1 text-sm border-collapse">
              <tr>
                <td colspan="2" class="text-lg pb-2 text-center border border-black">${nearestBranch.branch_name} - ${nearestBranch.branch_code}</td>
              </tr>
              <tr class="align-top" style="vertical-align: top;">
                <td class="p-2 border border-black">ADDRESS:</td>
                <td class="p-2 border border-black">${nearestBranch.branch_address}</td>
              </tr>
              <tr class="align-top">
                <td class="p-2 border border-black">CITY:</td>
                <td class="p-2 border border-black">${nearestBranch.branch_city}</td>
              </tr>
              <tr class="align-top">
                <td class="p-2 border border-black">STATE:</td>
                <td class="p-2 border border-black">${nearestBranch.branch_state}</td>
              </tr>
              <tr class="align-top">
                <td class="p-2 border border-black">PINCODE:</td>
                <td class="p-2 border border-black">${nearestBranch.branch_pincode}</td>
              </tr>
            </table>
            <div class="distance-container mt-2 ml-2 text-md italic">
            </div>
          </div>`;

    document.querySelector("div.branch-item").addEventListener("click", () => {
      map.flyTo({
        center: [nearestBranch.lon, nearestBranch.lat],
        essential: true,
        zoom: 12,
      });
    });
  } else {
    document.getElementById("nearest-branches-list").innerHTML =
      "<h2>No Branches Found!</h2>";
  }
};


const searchBar = document.getElementById("search-bar")
const searchInput = document.getElementById("search-input")
const searchButton = document.getElementById("search-button")
const resultContainer = document.getElementById("result-container")

//Searchbar on Search
searchBar.addEventListener('submit', async (event) => {

  event.preventDefault();
  resultContainer.innerHTML = ""

  const query = searchInput.value
  const searchResults = []

  const branchResults = searchTCIBranch(query);
  branchResults.forEach((r) => {
    searchResults.push(r)
  });

  const nominatimResults = await searchNominatim(query);
  nominatimResults.forEach((r) => {
    searchResults.push(r);
  });

  if (searchResults.length > 0) {
    searchResults.forEach((s) => {
      const row = document.createElement("div")
      row.classList.add("flex", "items-start", "px-2", "py-1", "mb-4", "text-md", "font-sans", "hover:bg-slate-100")
      row.innerHTML = `<img src="${s.image}" width="18" height="18" class="mt-1 mr-4">
            <span>${s.name}</span>`

      row.addEventListener('click', () => {
        searchNearestBranch(s.center);

        if (!document.querySelector(".search-result-marker")) {
          searchResultMarker.addClassName('search-result-marker')
          searchResultMarker.setLngLat(s.center)
          searchResultMarker.addTo(map);
        } else {
          searchResultMarker.setLngLat(s.center);
        }


        /* map.flyTo({
          center: s.center,
          essential: true,
          zoom: 12
        }); */
      });
      resultContainer.appendChild(row)
    });

  } else {
    resultContainer.innerHTML = `<div style="display: flex; justify-content: center; opacity: 0.5; font-family: ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol, Noto Color Emoji;">
              <h2>No results!</h2>`
  };
});

searchBar.addEventListener('reset', () => {
  searchResultMarker.remove();
  directions.removeWaypoint(0);

  resultContainer.innerHTML = ""
});

function searchTCIBranch(query) {
  const q = query.toLowerCase()
  const results = []

  tci_branches.forEach((branch) => {
    const condition = branch.branch_name.toLowerCase().includes(q) || branch.branch_city.toLowerCase().includes(q)

    if (condition) {
      console.log("found")
      results.push({
        image: "./assets/TCI-logo-symbol.png",
        name: branch.branch_name + ', ' + branch.branch_state,
        center: [branch.lon, branch.lat]
      })
    };
  });
  return results
}

async function searchNominatim(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=geojson&countrycodes=in,np&addressdetails=1&polygon_geojson=1`

  const result = await fetch(url)
  const response = await result.json();

  const results = []

  if (response.features.length > 0) {

    response.features.forEach((feature) => {
      const center = [
        feature.bbox[0] + (feature.bbox[2] - feature.bbox[0]) / 2,
        feature.bbox[1] + (feature.bbox[3] - feature.bbox[1]) / 2,
      ];

      results.push({
        image: "./assets/ic-location.png",
        name: feature.properties.display_name,
        center
      })
    });
  };

  return results;
};

async function addTCIBranchesToMap() {

  /* try {
    const response = await fetch("assets/tci_branches.json")
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    };

    tci_branches = await response.json();
  } catch (error) {
    console.error("Error loading branch data:", error);
  }; */

  map.addSource("tci-branches", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: tci_branches.map((branch) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [branch.lon, branch.lat],
        },
        properties: {
          name: branch.branch_name,
          code: branch.branch_code,
          address: branch.branch_address,
          city: branch.branch_city,
          state: branch.branch_state,
          pincode: branch.branch_pincode,
        },
      })),
    },
  });

  const logoImage = await map.loadImage("./assets/TCI-logo-symbol.png");
  map.addImage("branch-marker", logoImage.data);

  // Add a layer to display the markers
  map.addLayer({
    id: "branch-markers",
    type: "symbol",
    source: "tci-branches",
    layout: {
      "icon-image": "branch-marker", // Use the custom image
      "icon-size": 0.22, // Scale the image (adjust as needed)
      "icon-allow-overlap": true, // Allow icons to overlap
    },
  });
}

const branchesContainerHeader = document.getElementById('branches-container-header')
const branchesContainer = document.getElementById('branches-container')
const sheetHandle = document.getElementById("sheet-handle")

sheetHandle.addEventListener('click', () => {
  branchesContainer.classList.toggle("translate-y-[85%]")
  sheetHandle.classList.toggle("rotate-180")
})