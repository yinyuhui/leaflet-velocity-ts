import Windy from './windy';
import CanvasBound from './canvasBound'
import MapBound from './mapBound';
import Layer from "./layer";
import CanvasLayer from './L.CanvasLayer';
import * as L from 'leaflet';


const L_CanvasLayer = (L.Layer ? L.Layer : L.Class).extend(new CanvasLayer());
let L_canvasLayer = function () {
	return new L_CanvasLayer();
};

export default class VelocityLayer {

    private options: any;
    private _map: L.Map = null;
	private _canvasLayer: any = null;
	private _windy: Windy = null;
	private _context: any = null;
	private _displayTimeout: number = 0;
	private _events: Object = null
    
    constructor () {
        this.options = {
            displayValues: true,
            displayOptions: {
                velocityType: 'Velocity',
                position: 'bottomleft',
                emptyString: 'No velocity data'
            },
            maxVelocity: 10, // used to align color scale
            colorScale: null,
            data: null
		};
    }

	initialize(options: any) {
		L.Util.setOptions(this, options);
	}

	onAdd(map: L.Map) {
		// create canvas, add overlay control
		this._canvasLayer = L_canvasLayer().delegate(this);
		this._canvasLayer.addTo(map);
		this._map = map;
	}

	onRemove(map: any) {
		this._destroyWind();
	}

	setData(data: any) {
		this.options.data = data;

		if (this._windy) {
			this._windy.setData(data);
			this._clearAndRestart();
		}

		(<any>this).fire('load');
	}

	/*------------------------------------ PRIVATE ------------------------------------------*/

	onDrawLayer(overlay: any, params: any) {
		var self = this;

		if (!this._windy) {
			this._initWindy();
			return;
		}

		if (!this.options.data) {
			return;
		}

		if (this._displayTimeout) clearTimeout(self._displayTimeout);

		this._displayTimeout = setTimeout(function () {
			self._startWindy();
		}, 150); // showing velocity is delayed
	}

	_startWindy() {
		var bounds = this._map.getBounds();
		var size = this._map.getSize();

		// bounds, width, height, extent
		this._windy.start(
			new Layer(
				new MapBound(
					bounds.getNorthEast().lat,
					bounds.getNorthEast().lng,
					bounds.getSouthWest().lat,
					bounds.getSouthWest().lng
				),
				new CanvasBound(0,0,size.x, size.y)
			)
			
		);
	}

	_initWindy() {

		// windy object, copy options
		const options = (<any>Object).assign({ canvas: this._canvasLayer._canvas }, this.options);
		this._windy = new Windy(options);

		// prepare context global var, start drawing
		this._context = this._canvasLayer._canvas.getContext('2d');
		this._canvasLayer._canvas.classList.add("velocity-overlay");
		(<any>this).onDrawLayer();

		this._toggleEvents(true)
	}

	_toggleEvents(bind: boolean = true){
		if(this._events === null) {
			this._events = {
				'dragstart': () => {
					this._windy.stop();
				},
				'dragend': () => {
					this._clearAndRestart();
				},
				'zoomstart': () => {
					this._windy.stop();
				},
				'zoomend': () => {
					this._clearAndRestart();
				},
				'resize': () => {
					this._clearWind();
				}
			};
		}
		for(let e in this._events) {
			if(this._events.hasOwnProperty(e)) {
				this._map[bind ? 'on' : 'off'](e, this._events[e])
			}
		}
	}



	_clearAndRestart(){
		if (this._context) this._context.clearRect(0, 0, 3000, 3000);
		if (this._windy) this._startWindy();
	}

	_clearWind() {
		if (this._windy) this._windy.stop();
		if (this._context) this._context.clearRect(0, 0, 3000, 3000);
	}

	_destroyWind() {
		if (this._displayTimeout) clearTimeout(this._displayTimeout);
		if (this._windy) this._windy.stop();
		if (this._context) this._context.clearRect(0, 0, 3000, 3000);
		//off event bind
		this._toggleEvents(false)
		this._windy = null;
		this._map.removeLayer(this._canvasLayer);
	}
}