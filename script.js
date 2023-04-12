'use strict';

// prettier-ignore

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const reloadPage = document.querySelector('.reload');

class Workout {
	date = new Date()
	id = (Date.now() + "").slice(-10)

	constructor(coords, distance, duration) {
		this.coords = coords;
		this.distance = distance;
		this.duration = duration;
	}

	_setDescription() {
		const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
		this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`
	}
}

class Running extends Workout {
	type = "running"
	constructor(coords, distance, duration, cadence) {
		super(coords, distance, duration);
		this.cadence = cadence;
		this._calcPace();
		this._setDescription();
	}

	_calcPace() {
		this.pace = this.duration / this.distance;
		return this.pace;
	}
}

class Cycling extends Workout {
	type = "cycling"
	constructor(coords, distance, duration, elevation) {
		super(coords, distance, duration);
		this.elevation = elevation;
		this._calcSpeed();
		this._setDescription();
	}

	_calcSpeed() {
		this.speed =  this.distance / (this.duration / 60);
		return this.speed;
	}
}

///////////////////////////////////////////////
// APPLICATION
class App {
	#map;
	#mapEvent;
	#workouts = [];
	#mapZoomLevel = 17;

	constructor() {
		this._getPosition();
		this._getLocalStorage();
		form.addEventListener("submit", this._newWorkout.bind(this));
		inputType.addEventListener("change",this._toggleElevationField);
		containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));
		reloadPage.addEventListener("click", this._reset)
	}

	_getPosition() {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(this._loadMap.bind(this),(e) => {
					alert("Could not yet position");
				}
			)
		};
	}

	_loadMap(pos) {
		const {latitude, longitude} = pos.coords;
		const coords = [latitude, longitude];
		this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

		L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
	      attribution:
	        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
	    }).addTo(this.#map);

	    this.#map.on("click",this._showForm.bind(this));

	    this.#workouts.forEach(workout => {
	    	this._renderWorkoutMarker(workout);
	    });
	}

	_showForm(mapE) {
	    	this.#mapEvent = mapE;
	    	form.classList.remove("hidden");
	    	inputDistance.focus();
	}

	_toggleElevationField() {
		inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
		inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
	}

	_newWorkout(e) {
		e.preventDefault();

		const validInput = (...inputs) => inputs.every(inp => Number.isFinite(inp));
		const checkNumberPositive = (...inputs) => inputs.every(inp => inp > 0);
		
		// Get data from form
		const type = inputType.value;
		const distance = +inputDistance.value;
		const duration = +inputDuration.value;
	   	const {lat, lng} = this.#mapEvent.latlng;
	   	let workout;

		// If workout running, creating running object
		if (type == "running") {
			const cadence = +inputCadence.value;
		
			// Check if data is valid
			if (!validInput(distance, duration, cadence) || !checkNumberPositive(distance, duration, cadence)) 
				return alert("Inputs have to be positive number");

			workout = new Running([lat, lng], distance, duration, cadence);
		}

		// If workout cycling, creating cycling object
		if (type == "cycling") {
			const elevation = +inputElevation.value;

			// Check if data is valid
			if (!validInput(distance, duration, elevation) || !checkNumberPositive(distance, duration)) 
				return alert("Inputs have to be positive number");
			
			workout = new Cycling([lat, lng], distance, duration, elevation);
		}


		// Add new object to workout Array
		this.#workouts.push(workout);

		// Render workout on map as marker
		this._renderWorkoutMarker(workout);

		// Render Workout on List
		this._renderWorkoutToList(workout);

	   	// Hidden form + clear input field
	   	this._hideForm();

	   	// Set Local Storage from Workouts
    	this._setLocalStorage();
	}

	_hideForm() {
	    inputDistance.value =
	      inputDuration.value =
	      inputCadence.value =
	      inputElevation.value =
	        "";

	    form.style.display = "none";
	    form.classList.add("hidden");
	    setTimeout(() => (form.style.display = "grid"), 1000);
	}

	_renderWorkoutMarker(workout) {
	   	L.marker(workout.coords).addTo(this.#map)
	   	.bindPopup(L.popup ({
	   		minWidth: 100,
	   		maxWidth: 250,
	   		autoClose: false,
	   		closeOnClick: false,
	   		className: `${workout.type}-popup`,
	   	}))
	   	.setPopupContent(workout.description)
	   	.openPopup();

	}

	_renderWorkoutToList(workout) {
		let html = `
			<li class="workout workout--${workout.type}" data-id="${workout.id}">
	          <h2 class="workout__title">${workout.description}</h2>
	          <div class="workout__details">
	            <span class="workout__icon">${workout.type == "running" ? "🏃‍♂️" : "🚴‍♀️"}</span>
	            <span class="workout__value">${workout.distance}</span>
	            <span class="workout__unit">km</span>
	          </div>
	          <div class="workout__details">
	            <span class="workout__icon">⏱</span>
	            <span class="workout__value">${workout.duration}</span>
	            <span class="workout__unit">min</span>
	          </div>
	          <div class="workout__details">
	            <span class="workout__icon">⚡️</span>
	            <span class="workout__value">${(workout.type == "running" ? workout.pace : workout.speed).toFixed(1)}</span>
	            <span class="workout__unit">min/km</span>
	          	</div>
	          	<div class="workout__details">
	          	  <span class="workout__icon">🦶🏼</span>
	          	  <span class="workout__value">${workout.type == "running" ? workout.cadence : workout.elevation}</span>
	          	  <span class="workout__unit">spm</span>
	          	</div>
	        </li>
		`
		form.insertAdjacentHTML("afterend", html);
	}

	_moveToPopup(e) {
		const workoutElement = e.target.closest(".workout");

		if (!workoutElement) return;

		const workout = this.#workouts.find(work => work.id === workoutElement.dataset.id);
		this.#map.setView(workout.coords, this.#mapZoomLevel, {
      		Animation: true,
      		pan: {
      		  duration: 1,
      		},
    	});
	}

	_setLocalStorage() {
		localStorage.setItem("workout", JSON.stringify(this.#workouts));
	}

	_getLocalStorage() {
		const data = JSON.parse(localStorage.getItem("workout"));
		
		if (!data) return;
		this.#workouts = data;
		this.#workouts.forEach(workout => {
			this._renderWorkoutToList(workout);
		});
	}

	_reset() {
		if (confirm('Are you sure to initialize the project?')) {
			localStorage.removeItem("workout");
			location.reload();
		} else {
		  	return;
		}
	}
}

const app = new App();
