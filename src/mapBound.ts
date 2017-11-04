import CanvasBound from "./canvasBound";

export default class MapBound {
    public south: number;
    public north: number;
    public east: number;
    public west: number;
    public canvasBound: CanvasBound;

    constructor (north: number, east: number, south: number, west: number, canvasBound: CanvasBound) {
        this.north = north;
        this.east = east;
        this.south = south;
        this.west = west;
        this.canvasBound = canvasBound;
    }

    get width () : number {
        return (720 + this.east - this.west) % 360;
    }

    get height () : number {
        return (360 + this.north - this.south) % 180;
    }

    deg2rad (deg: number): number {
      return deg * Math.PI / 180;
    };

      rad2deg (rad: number): number {
      return rad * 180 / Math.PI;
    };

    /**
     * Find geocoordinate from canvas point
     * @param x 
     * @param y 
     * return [lng, lat]
     */
    canvasToMap (x: number, y: number): number[] {
      const mapLonDelta = this.east - this.west;
      const worldMapRadius = this.canvasBound.width / this.rad2deg(mapLonDelta) * 360/(2 * Math.PI);
      const mapOffsetY = ( worldMapRadius / 2 * Math.log( (1 + Math.sin(this.south) ) / (1 - Math.sin(this.south))  ));
      const equatorY = this.canvasBound.height + mapOffsetY;
      const a = (equatorY-y)/worldMapRadius;

      const φ = 180/Math.PI * (2 * Math.atan(Math.exp(a)) - Math.PI/2);
      const λ = this.rad2deg(this.west) + x / this.canvasBound.width * this.rad2deg(mapLonDelta);
      return [λ, φ];
    };
    
    mercY (φ: number): number {
		  return Math.log( Math.tan( φ / 2 + Math.PI / 4 ) );
    };
    
    /**
     * Project a point on the map
     * @param λ Longitude
     * @param φ Latitude
     * @return [x, y]
     */
    mapToCanvas (λ: number, φ: number): number[] {
      const ymin = this.mercY(this.south);
      const ymax = this.mercY(this.north);
      const xFactor = this.canvasBound.width / ( this.east - this.west );
      const yFactor = this.canvasBound.height / ( ymax - ymin );

      let y = this.mercY(this.deg2rad(φ) );
      const x = (this.deg2rad(λ) - this.west) * xFactor;
      y = (ymax - y) * yFactor;
      return [x, y];
    };


    /**
     * 
     * @param λ Longitude
     * @param φ Latitude
     * @param x 
     * @param y 
     * @return []
     */
	distortion (λ: number, φ: number, x: number, y: number): number[] {
		const τ = 2 * Math.PI;
		const H = Math.pow(10, -5.2);
		const hλ = λ < 0 ? H : -H;
		const hφ = φ < 0 ? H : -H;

		const pλ = this.mapToCanvas(φ, λ + hλ);
		const pφ = this.mapToCanvas(φ + hφ, λ);

		// Meridian scale factor (see Snyder, equation 4-3), where R = 1. This handles issue where length of 1º λ
		// changes depending on φ. Without this, there is a pinching effect at the poles.
		const k = Math.cos(φ / 360 * τ);
		return [
			(pλ[0] - x) / hλ / k,
			(pλ[1] - y) / hλ / k,
			(pφ[0] - x) / hφ,
			(pφ[1] - y) / hφ
		];
    }
    
    /**
	 * Calculate distortion of the wind vector caused by the shape of the projection at point (x, y). The wind
	 * vector is modified in place and returned by this function.
     * @param λ 
     * @param φ 
     * @param x 
     * @param y 
     * @param scale scale factor
     * @param wind [u, v]
     * @return []
	 */
	distort (λ: number, φ: number, x: number, y: number, scale: number, wind: number[]): number[] {
		const u = wind[0] * scale;
		const v = wind[1] * scale;
		const d = this.distortion(λ, φ, x, y);

		// Scale distortion vectors by u and v, then add.
		wind[0] = d[0] * u + d[2] * v;
		wind[1] = d[1] * u + d[3] * v;
		return wind;
    }

}