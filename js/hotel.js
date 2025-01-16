// Fetch data from the /api/hotels endpoint and dynamically populate the cards
fetch('/api/hotels') // Fetch data from the server API
    .then(response => response.json())
    .then(data => {
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
                            <button class="card-button">BOOK NOW</button>
                        </div>
                    </div>`;
                cardContainer.innerHTML += cardHTML;
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
