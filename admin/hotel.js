let hotelData = [];

document.querySelectorAll('.sidebar nav ul li a').forEach(link => {
    link.addEventListener('click', function(event) {
        event.preventDefault();
        
        // Remove active class from all sections
        document.querySelectorAll('.tab-content').forEach(section => {
            section.classList.remove('active');
        });
        
        // Remove active state from all links
        document.querySelectorAll('.sidebar nav ul li a').forEach(link => {
            link.classList.remove('active');
        });
        
        // Add active class to the clicked link and the corresponding section
        const tab = this.getAttribute('data-tab');
        document.getElementById(tab).classList.add('active');
        this.classList.add('active');
    });
});

// Fetch data from the /api/hotels endpoint and dynamically populate the cards
fetch('/api/hotels') // Fetch data from the server API
    .then(response => response.json())
    .then(data => {
        hotelData = data;
        const cardContainer = document.getElementById('cardz-container');
        const filterButtons = document.querySelectorAll('.filter-buttons button');

        // Function to render cards based on a filter
        const renderCards = (filter = null) => {
            cardContainer.innerHTML = ''; // Clear existing content

            // Apply filter if provided, otherwise use all data
            const filteredData = filter ? data.filter(hotel => hotel.location_filter === filter) : data;

            // Loop through the filtered data and create cards
            filteredData.forEach(hotel => {
                const cardHTML = `
                    <div class="cards">
                        <div class="card-image">
                            <img src="${hotel.image}" alt="${hotel.name}">
                        </div>
                        <div class="card-content">
                            <h3 class="card-title">${hotel.name}</h3>
                            <p class="card-location">
                                <img src="https://vinpearl.com/themes/porto/images/booking_popup/teaser_hotel_location.svg">
                                ${hotel.location}
                            </p>
                            <p class="card-phone">
                                <img src="https://vinpearl.com/themes/porto/images/booking_popup/teaser_hotel_call.svg">
                                ${hotel.phone}
                            </p>
                            <div class="card-rating">
                                <img src="https://vinpearl.com/themes/porto/images/booking_popup/teaser_hotel_owl.svg">
                                <span class="trip-ad-dot-outer"><span class="trip-ad-dot"></span></span>
                                <span class="trip-ad-dot-outer"><span class="trip-ad-dot"></span></span>
                                <span class="trip-ad-dot-outer"><span class="trip-ad-dot"></span></span>
                                <span class="trip-ad-dot-outer"><span class="trip-ad-dot"></span></span>
                                <span class="trip-ad-dot-outer"><span class="trip-ad-dot half"></span></span>
                                <span>(4.5)</span>
                            </div>
                            <p class="card-price">
                                Giá Chỉ Từ <span>${hotel.price_per_night} ${hotel.currency}</span> /Đêm
                            </p>
                        </div>
                        <div class="card-buttons">
                            <button class="modify-hotel" data-id="${hotel.hotel_id}">Modify</button>
                            <button class="remove-hotel" data-id="${hotel.hotel_id}">Remove</button>
                        </div>

                        
                    </div>`;
                cardContainer.innerHTML += cardHTML;
            });
            document.querySelectorAll('.modify-hotel').forEach(button => {
                button.addEventListener('click', openModifyModal);
            });
        
            document.querySelectorAll('.remove-hotel').forEach(button => {
                button.addEventListener('click', deleteHotel);
            });
        };

        // Initially render all cards
        renderCards();

        // Add event listeners to filter buttons
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove 'active' class from all buttons and add it to the clicked button
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // Get the filter value from the data-filter attribute
                const filter = button.getAttribute('data-filter');
                renderCards(filter);
            });
        });
    })
    .catch(error => console.error('Error fetching data:', error));

    // Modal functionality
const addHotelButton = document.getElementById("add-hotel-button");
const modal = document.getElementById("add-hotel-form");
const closeBtn = document.querySelector(".close");

// Show modal
addHotelButton.addEventListener("click", () => {
    modal.style.display = "block";
});

// Close modal
closeBtn.addEventListener("click", () => {
    modal.style.display = "none";
});

// Close modal when clicking outside
window.addEventListener("click", (event) => {
    if (event.target === modal) {
        modal.style.display = "none";
    }
});

// Get the image URL input and preview image elements
const imageUrlInput = document.getElementById('imageUrl');
const imagePreview = document.getElementById('imagePreview');

// Add an event listener to update the preview when the URL changes
imageUrlInput.addEventListener('input', () => {
    const imageUrl = imageUrlInput.value.trim();

    // If a valid URL is entered, display the image preview
    if (imageUrl) {
        imagePreview.src = imageUrl;
        imagePreview.style.display = 'block';
    } else {
        // Hide the preview if the input is empty
        imagePreview.style.display = 'none';
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const hotelForm = document.getElementById('hotel-form');
    
    hotelForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const formData = {
            name: document.getElementById('name').value,
            location: document.getElementById('location').value,
            location_filter: document.getElementById('location_filter').value,
            phone: document.getElementById('phone').value,
            price_per_night: document.getElementById('price_per_night').value,
            currency: document.getElementById('currency').value,
            imageUrl: document.getElementById('imageUrl').value,
        };

        try {
            const response = await fetch('http://localhost:3000/add-hotel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const result = await response.json();

            if (result.success) {
                alert(result.message); // Display success message
                hotelForm.reset(); // Clear the form
                document.getElementById('add-hotel-form').style.display = 'none'; // Close modal
            } else {
                alert(result.message || 'Failed to add hotel.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
        }
    });
});


// Close modal functionality
closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    hotelForm.reset();
    imagePreview.style.display = 'none';
});

const modifyModal = document.getElementById("modify-hotel-form");
const modifyForm = document.getElementById("modify-form");

// Function to open modify modal and pre-fill data
function openModifyModal(event) {
    const hotelId = event.target.dataset.id;
    const hotel = hotelData.find(h => h.hotel_id == hotelId);

    if (!hotel) return;

    document.getElementById('modify-name').value = hotel.name;
    document.getElementById('modify-location').value = hotel.location;
    document.getElementById('modify-location_filter').value = hotel.location_filter;
    document.getElementById('modify-phone').value = hotel.phone;
    document.getElementById('modify-price_per_night').value = hotel.price_per_night;
    document.getElementById('modify-currency').value = hotel.currency;
    document.getElementById('modify-imageUrl').value = hotel.image;
    document.getElementById('modify-hotel-id').value = hotel.hotel_id;

    modifyModal.style.display = "block";
}

// Handle form submission for modifying hotel
document.getElementById("modify-form").addEventListener('submit', async (event) => {
    event.preventDefault();

    const hotelId = document.getElementById('modify-hotel-id').value;
    const formData = {
        name: document.getElementById('modify-name').value,
        location: document.getElementById('modify-location').value,
        location_filter: document.getElementById('modify-location_filter').value,
        phone: document.getElementById('modify-phone').value,
        price_per_night: document.getElementById('modify-price_per_night').value,
        currency: document.getElementById('modify-currency').value,
        image: document.getElementById('modify-imageUrl').value,
    };

    try {
        const response = await fetch(`http://localhost:3000/admin/update_hotels/${hotelId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
        });

        const result = await response.json();

        if (result.success) {
            alert(result.message);
            document.getElementById("modify-hotel-form").style.display = "none";
            fetch('/api/hotels') // Refresh data after update
                .then(response => response.json())
                .then(data => {
                    hotelData = data;
                    renderCards();
                });
        } else {
            alert(result.message || "Failed to update hotel.");
        }
    } catch (error) {
        console.error("Error:", error);
        alert("An error occurred. Please try again.");
    }
});

// Close modify modal when clicking outside
window.addEventListener("click", (event) => {
    if (event.target === modifyModal) {
        modifyModal.style.display = "none";
    }
});

async function deleteHotel(event) {
    const hotelId = event.target.dataset.id;

    console.log("Hotel ID:", hotelId); 

    if (!hotelId) {
        alert("Error: Hotel ID is missing.");
        return;
    }

    if (!confirm("Are you sure you want to remove this hotel?")) return;

    try {
        const response = await fetch(`http://localhost:3000/admin/remove_hotels/${hotelId}`, {
            method: 'DELETE',
        });

        const result = await response.json();
        console.log("Delete response:", result);

        if (result.success) {
            alert(result.message);
            fetch('/api/hotels') // Refresh data after deletion
                .then(response => response.json())
                .then(data => {
                    hotelData = data;
                    renderCards();
                });
        } else {
            alert(result.message || "Failed to delete hotel.");
        }
    } catch (error) {
        console.error("Error:", error);
        alert("An error occurred. Please try again.");
    }
}
