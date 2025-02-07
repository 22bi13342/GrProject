

// Toggle dropdown visibility on click (for destination)
document.getElementById("destination-btn").addEventListener("click", function () {
    this.classList.toggle("active");
    const dropdownContent = document.getElementById("destination-options");
    dropdownContent.style.display =
        dropdownContent.style.display === "block" ? "none" : "block";
});

// Handle destination selection
let selectedHotelId = null;
document.querySelectorAll("#destination-options p").forEach((option) => {
    option.addEventListener("click", function () {
        const destinationBtn = document.getElementById("destination-btn");
        destinationBtn.textContent = this.textContent; 
        destinationBtn.classList.remove("active");
        document.getElementById("destination-options").style.display = "none";

        selectedHotelId = this.dataset.hotelId;
        console.log("Selected Hotel ID:", selectedHotelId); 
    });
});

// Fetch hotel names and populate the dropdown
function loadHotels() {
    fetch("http://localhost:3000/api/hotels")
        .then((response) => response.json())
        .then((hotels) => {
            const dropdownContent = document.getElementById("destination-options");
            dropdownContent.innerHTML = ""; 

            hotels.forEach((hotel) => {
                const option = document.createElement("p");
                option.textContent = hotel.name;
                option.dataset.hotelId = hotel.hotel_id;
                dropdownContent.appendChild(option);

                option.addEventListener("click", function () {
                    const destinationBtn = document.getElementById("destination-btn");
                    destinationBtn.textContent = this.textContent;
                    destinationBtn.classList.remove("active");
                    dropdownContent.style.display = "none";

                    selectedHotelId = this.dataset.hotelId;
                    console.log("Selected Hotel ID from dropdown:", selectedHotelId);
                });
            });
        })
        .catch((error) => console.error("Error fetching hotels:", error));
}

// Fetch rooms for the selected hotel
function fetchRooms(hotelId, checkInDate, checkOutDate) {
    const url = `http://localhost:3000/api/rooms?hotelId=${hotelId}&checkInDate=${checkInDate}&checkOutDate=${checkOutDate}`;
    fetch(url)
        .then((response) => response.json())
        .then((rooms) => {
            const roomList = document.getElementById("room-list");
            roomList.innerHTML = ""; // Clear previous room data

            if (rooms.length === 0) {
                roomList.innerHTML = "<p>No available rooms for this hotel.</p>";
                return;
            }

            rooms.forEach((room) => {
                const roomCard = document.createElement("div");
                roomCard.className = "room-card";
                roomCard.innerHTML = `
                    <div class="room-content">
                        <div class="carousel">
                            ${room.Images.map((img, index) => `
                                <div class="carousel-item${index === 0 ? ' active' : ''}">
                                    <img src="${img}" alt="Room Image ${index + 1}" />
                                </div>
                            `).join('')}
                            <button class="carousel-prev">&#10094;</button>
                            <button class="carousel-next">&#10095;</button>
                        </div>
                        <div class="room-details">
                            <h3>${room.RoomName}</h3>
                            <p>Price per night: ${room.PricePerNight.toLocaleString()} VND</p>
                            <p>Max Occupancy: ${room.MaxOccupancy} people</p>
                            <p>Available Rooms: ${room.AvailableRooms}</p>
                            <p class = "detail" data-room-id="${room.RoomID}">Room Detail > </p>
                            <button class="book-now-btn" data-room-id="${room.RoomID}" data-price-per-night="${room.PricePerNight}">Book Now</button>
                        </div>
                    </div>
                `;
                roomList.appendChild(roomCard);

                initCarousel(roomCard);

                roomCard.querySelector(".detail").addEventListener("click", function () {
                    const roomId = this.dataset.roomId;
                    fetchRoomDetails(roomId);
                });

                roomCard.querySelector(".book-now-btn").addEventListener("click", function () {
                    const roomId = this.dataset.roomId;
                    const pricePerNight = parseFloat(this.dataset.pricePerNight);
                    const checkInDate = document.getElementById("checkin").value;
                    const checkOutDate = document.getElementById("checkout").value;

                    if (!checkInDate || !checkOutDate) {
                        alert("Please select both check-in and check-out dates.");
                        return;
                    }

                    if (checkOutDate <= checkInDate) {
                        alert("Checkout date must be later than the check-in date.");
                        return;
                    }

                    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
                    if (!loggedInUser || !loggedInUser.id) {
                        alert("Please log in before booking.");
                        return;
                    }

                    const loggedInUserId = loggedInUser.id;

                    const numberOfNights = Math.max(
                        Math.ceil(
                            (new Date(checkOutDate) - new Date(checkInDate)) / 
                                (1000 * 60 * 60 * 24)
                        ),
                        1
                    );

                    const totalPrice = numberOfNights * pricePerNight;

                    createBooking(loggedInUserId, roomId, checkInDate, checkOutDate, totalPrice);
                });
            });
        })
        .catch((error) => console.error("Error fetching rooms:", error));
}

function initCarousel(roomCard) {
    const items = roomCard.querySelectorAll(".carousel-item");
    const prevButton = roomCard.querySelector(".carousel-prev");
    const nextButton = roomCard.querySelector(".carousel-next");
    let currentIndex = 0;

    function updateCarousel() {
        items.forEach((item, index) => {
            item.classList.toggle("active", index === currentIndex);
        });
    }

    prevButton.addEventListener("click", () => {
        currentIndex = (currentIndex === 0) ? items.length - 1 : currentIndex - 1;
        updateCarousel();
    });

    nextButton.addEventListener("click", () => {
        currentIndex = (currentIndex === items.length - 1) ? 0 : currentIndex + 1;
        updateCarousel();
    });

    updateCarousel();
}

// Create a booking
function createBooking(userId, roomId, checkInDate, checkOutDate, totalPrice) {
    const bookingData = {
        userId,
        roomId,
        checkInDate,
        checkOutDate,
        totalPrice,
    };
    fetch("http://localhost:3000/api/bookings", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(bookingData),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                alert("Booking successful!. Please direct to profile to finish payment");
            } else {
                alert("Failed to book room. Please try again.");
            }
        })
        .catch((error) => console.error("Error creating booking:", error));
}

// Load hotels on page load
document.addEventListener("DOMContentLoaded", () => {
    loadHotels();
});

// Handle the search button click event
document.querySelector(".search-btn").addEventListener("click", function (e) {
    e.preventDefault();

    const checkInDate = document.getElementById("checkin").value;
    const checkOutDate = document.getElementById("checkout").value;

    if (!selectedHotelId) {
        alert("Please select a hotel.");
        return;
    }
    
    if (!checkInDate || !checkOutDate) {
        alert("Please select both check-in and check-out dates.");
        return;
    }

    if (new Date(checkOutDate) <= new Date(checkInDate)) {
        alert("Checkout date must be later than the check-in date.");
        return;
    }

    console.log("Fetching rooms with date filter:", checkInDate, checkOutDate);

    fetchRooms(selectedHotelId, checkInDate, checkOutDate);
});

function openRoomDetailModal(room) {
    const modal = document.getElementById("room-detail-modal");
    document.getElementById("modal-room-name").textContent = room.RoomName;
    document.getElementById("modal-room-description").textContent = room.description;

    // Populate image carousel
    const carouselContainer = document.getElementById("modal-room-carousel");
    carouselContainer.innerHTML = ""; // Clear previous images

    room.Images.forEach((img, index) => {
        const imgElement = document.createElement("img");
        imgElement.src = img;
        imgElement.classList.add("carousel-image");
        if (index === 0) imgElement.classList.add("active");
        carouselContainer.appendChild(imgElement);
    });

    // Populate facilities
    const facilitiesList = document.getElementById("modal-room-facilities");
    facilitiesList.innerHTML = "";
    room.facilities.forEach((facility) => {
        const li = document.createElement("li");
        li.textContent = facility;
        facilitiesList.appendChild(li);
    });

    // Show modal
    modal.style.display = "flex";

    // Close modal on click
    document.querySelector(".close").addEventListener("click", () => {
        modal.style.display = "none";
    });

    // Carousel logic
    let currentIndex = 0;
    const images = document.querySelectorAll(".carousel-image");

    function updateCarousel() {
        images.forEach((img, index) => {
            img.classList.toggle("active", index === currentIndex);
        });
    }

    document.getElementById("prev-btn").addEventListener("click", () => {
        currentIndex = (currentIndex === 0) ? images.length - 1 : currentIndex - 1;
        updateCarousel();
    });

    document.getElementById("next-btn").addEventListener("click", () => {
        currentIndex = (currentIndex === images.length - 1) ? 0 : currentIndex + 1;
        updateCarousel();
    });
}

// Fetch room details function (Ensure this is ABOVE fetchRooms)
function fetchRoomDetails(roomId) {
    fetch(`http://localhost:3000/api/room_details?roomId=${roomId}`)
        .then((response) => response.json())
        .then((room) => {
            openRoomDetailModal(room);
        })
        .catch((error) => console.error("Error fetching room details:", error));
}