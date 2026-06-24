import { React } from 'jimu-core'
import { CollapsableCheckbox, Checkbox, Label, Select, Alert, NumericInput } from 'jimu-ui'
import Graphic from "esri/Graphic";
import Point from 'esri/geometry/Point';
import Polyline from 'esri/geometry/Polyline';
import SpatialReference from 'esri/geometry/SpatialReference';
import projectOperator from 'esri/geometry/operators/projectOperator';
import geodeticAreaOperator from 'esri/geometry/operators/geodeticAreaOperator';
import geodeticLengthOperator from 'esri/geometry/operators/geodeticLengthOperator';
import areaOperator from 'esri/geometry/operators/areaOperator'
import lengthOperator from 'esri/geometry/operators/lengthOperator'

const { useState, useEffect } = React

interface ExtendedGraphic extends __esri.Graphic {
	measure?: {
		graphic: ExtendedGraphic;
		areaUnit?: string;
		lengthUnit?: string;
	};
	measureParent?: ExtendedGraphic;
	checked?: boolean;
	originalSymbol?: any; // Use 'any' here to avoid TypeScript errors
}
const Measure = (props) => {
	const drawLayer = props.drawLayer
	const currentTextSymbol = props.currentTextSymbol
	const sketchViewModel = props.sketchViewModel
	const currentTool = props.currentTool
	const showTextPreview = props.showTextPreview

	const isTextSymbol = (symbol: any): symbol is __esri.TextSymbol => {
		return symbol &&
			typeof symbol === 'object' &&
			symbol.type === 'text' &&
			typeof symbol.text === 'string';
	}
	//Built-in units
	const defaultDistanceUnits = [
		{ unit: 'kilometers', label: props.nls('kilometers') || 'Kilometers', abbreviation: 'km', conversion: 0.001 },
		{ unit: 'miles', label: props.nls('miles') || 'Miles', abbreviation: 'mi', conversion: 0.000621371 },
		{ unit: 'meters', label: props.nls('meters') || 'Meters', abbreviation: 'm', conversion: 1 },
		{ unit: 'nautical-miles', label: props.nls('nauticals') || 'Nautical Miles', abbreviation: 'NM', conversion: 0.000539957 },
		{ unit: 'feet', label: props.nls('feet') || 'Feet', abbreviation: 'ft', conversion: 3.28084 },
		{ unit: 'yards', label: props.nls('yards') || 'Yards', abbreviation: 'yd', conversion: 1.09361 }
	];

	const defaultAreaUnits = [
		{ unit: 'square-kilometers', label: props.nls('squareKilometers') || 'Square Kilometers', abbreviation: 'km²', conversion: 0.000001 },
		{ unit: 'square-miles', label: props.nls('squareMiles') || 'Square Miles', abbreviation: 'mi²', conversion: 3.86102e-7 },
		{ unit: 'acres', label: props.nls('acres') || 'Acres', abbreviation: 'ac', conversion: 0.000247105 },
		{ unit: 'hectares', label: props.nls('hectares') || 'Hectares', abbreviation: 'ha', conversion: 0.0001 },
		{ unit: 'square-meters', label: props.nls('squareMeters') || 'Square Meters', abbreviation: 'm²', conversion: 1 },
		{ unit: 'square-feet', label: props.nls('squareFeet') || 'Square Feet', abbreviation: 'ft²', conversion: 10.7639 },
		{ unit: 'square-yards', label: props.nls('squareYards') || 'Square Yards', abbreviation: 'yd²', conversion: 1.19599 }
	];
	//combine built-in and user defined units
	const distanceUnits = [...defaultDistanceUnits, ...props.config.userDistances]
	const areaUnits = [...defaultAreaUnits, ...props.config.userAreas]

	const [distanceUnit, setDistanceUnit] = useState(distanceUnits[props.config.defaultDistance] || distanceUnits[0])
	const [areaUnit, setAreaUnit] = useState(areaUnits[props.config.defaultArea] || areaUnits[0])
	const [availableDistanceUnits, setAvailableDistanceUnits] = useState(distanceUnits)
	const [availableAreaUnits, setAvailableUnits] = useState(areaUnits)
	const [measureEnabled, setMeasureEnabled] = useState(false)
	const [updateListener, setUpdateListener] = useState(null)
	const [createListener, setCreateListener] = useState(null)
	const [removalListener, setRemovalListener] = useState(null)
	const [xy, setXy] = useState(false)
	const [latLong, setLatLong] = useState(true)
	const [wkid, setWkid] = useState(false)
	const [lengthOn, setLengthOn] = useState(true)
	const [areaOn, setAreaOn] = useState(true)
	const [perimeterOn, setPerimeterOn] = useState(true)
	const [radiusOn, setRadiusOn] = useState(true)
	const [segmentsOn, setSegmentsOn] = useState(false)
	const [currentGraphic, setCurrentGraphic] = useState(null)
	const [toolType, setToolType] = useState(currentTool)
	const [tooltips, setTooltips] = useState(false)
	const [pointRound, setPointRound] = useState(5)
	const [otherRound, setOtherRound] = useState(2)

	//turn off measure for text
	useEffect(() => {
		if (showTextPreview) {
			setMeasureEnabled(false)
		}
	}, [showTextPreview])

	//when graphic selected find out what type it is
	useEffect(() => {
		if (sketchViewModel?.updateGraphics) {
			const graphic = sketchViewModel.updateGraphics.items[0]
			if (graphic?.visible) {
				const graphicType = graphic?.geometry.type
				let output = currentTool
				if (graphicType === 'polygon') {
					if (graphic.geometry.rings[0].length === 61) {
						output = 'circle'
						setSegmentsOn(false)
					} else {
						output = 'polygon'
					}
				} else if (graphicType) {
					output = graphicType
				}
				setToolType(output)
			}
		}
	}, [sketchViewModel?.updateGraphics.length])

	//run whenever measureEnabled changes or sketchViewModel becomes ready
	useEffect(() => {
		//console.log(sketchViewModel)
		//if measureEnabled load the calculators and create the event listeners
		if (measureEnabled) {
			geodeticAreaOperator.load()
			geodeticLengthOperator.load()
			liveMeasure()
			//delete the remove measurements listener
			if (removalListener) {
				removalListener.remove()
				setRemovalListener(null)
			}
		//if measurements not enabled and event listeners exist remove them
		} else if (updateListener && createListener) {
			updateListener.remove()
			createListener.remove()
			setUpdateListener(null)
			setCreateListener(null)
		}
		//if measurements off prepare to delete when updated
		if (!measureEnabled && sketchViewModel) {
			removeMeasurementsOnUpdate()
		}
	}, [measureEnabled, sketchViewModel])

	//when settings change delete and rebuild event listener
	useEffect(() => {
		if (updateListener && createListener) {
			updateListener.remove()
			createListener.remove()
			liveMeasure()
		}
	}, [distanceUnit.unit, areaUnit.unit, wkid, latLong, xy, lengthOn, segmentsOn, areaOn, perimeterOn, radiusOn, pointRound, otherRound])

	//when user presses tool type buttons find out what type
	useEffect(() => {
		//console.log(currentTool)
		if (currentTool === 'text') {
			setMeasureEnabled(false)
		}
		if (currentTool === 'extent') {
			setToolType('polygon')
		} else {
			setToolType(currentTool)
		}
	}, [currentTool])

	//when selected graphic changes find out what type
	useEffect(() => {
		//console.log(currentGraphic)
		if (currentGraphic?.visible) {
			const graphicType = currentGraphic?.geometry.type
			//console.log(graphicType)
			let output = currentTool
			if (graphicType === 'polygon') {
				if (currentGraphic.geometry.rings[0].length === 61) {
					output = 'circle'
					setSegmentsOn(false)
				} else {
					output = 'polygon'
				}
			} else if (graphicType) {
				output = graphicType
			}
			//console.log(output)
			setToolType(output)
		}
	}, [currentGraphic])

	//update tooltips when toggled or units change
	useEffect(() => {
		if (tooltips && sketchViewModel) {
			sketchViewModel.tooltipOptions.enabled = true
		} else if (sketchViewModel) {
			sketchViewModel.tooltipOptions.enabled = false
		}
		if (sketchViewModel) {
			const foundUnit = defaultDistanceUnits.find(defaultUnit => defaultUnit.unit === distanceUnit.unit)
			const foundAreaUnit = defaultAreaUnits.find(defaultUnit => defaultUnit.unit === areaUnit.unit)
			sketchViewModel.valueOptions = {
				displayUnits: {
					length: foundUnit?.unit || 'meters',
					area: foundAreaUnit?.unit || 'square-meters'
				},
				inputUnits: {
					length: foundUnit?.unit || 'meters',
					area: foundAreaUnit?.unit || 'square-meters'
				}
			}
		}
	}, [sketchViewModel, tooltips, distanceUnit.unit, areaUnit.unit])

	//removes existing measurements when graphic updates
	const removeMeasurementsOnUpdate = () => {
		const removalListener = sketchViewModel.on('update', (event) => {
			const graphic = event.graphics[0]
			//console.log(graphic)
			if (graphic && !measureEnabled) {
				if (graphic.measure?.graphic) {
					drawLayer.remove(graphic.measure.graphic)
				}
				if (graphic.attributes?.relatedSegmentLabels) {
					drawLayer.removeMany(graphic.attributes.relatedSegmentLabels)
				}
			}
		})
		setRemovalListener(removalListener)
	}

	//finds where to place a label
	const _getLabelPoint = (geometry) => {
		if (!geometry) return null;

		// If already a point, return it directly
		if (geometry.type === 'point') {
			return new Point({
				x: geometry.x,
				y: geometry.y,
				spatialReference: geometry.spatialReference
			});
		}

		// If the geometry supports centroid (e.g. Polygon), use it
		if ('centroid' in geometry && geometry.centroid) {
			return geometry.centroid;
		}

		// Fallback to extent center if available
		if (geometry.extent?.center) {
			return geometry.extent.center;
		}

		console.warn('Unable to determine label point for geometry type:', geometry.type);
		return null;
	};

	//main controller function for adding measurements
	const _addMeasurement = async (graphic: ExtendedGraphic, parentGraphic = null) => {
		if (graphic.symbol.type === 'text') {
			return true
		}
		const geometry = graphic.geometry;
		const labelPoint = _getLabelPoint(geometry);
		if (!labelPoint) return;

		const isPoint = geometry.type === 'point';
		let text: string;

		//for point graphics
		if (isPoint) {
			let xyCoords = ''
			let srWkid = ''
			if (xy) {
				xyCoords = `X: ${labelPoint.x.toFixed(pointRound)} \nY: ${labelPoint.y.toFixed(pointRound)}`
				if (wkid) {
					srWkid = '\nWKID: ' + labelPoint.spatialReference?.latestWkid || labelPoint.spatialReference?.wkid || 'unknown';
				}
			}
			let wgsCoords = '';

			try {
				if (!projectOperator.isLoaded()) {
					await projectOperator.load();
				}

				const [projected] = projectOperator.executeMany([labelPoint], SpatialReference.WGS84) as __esri.Point[];

				if (projected && latLong) {
					wgsCoords = `\nLat: ${projected.y.toFixed(pointRound)}\nLon: ${projected.x.toFixed(pointRound)}`;
					if (wkid) {
						wgsCoords = wgsCoords + '\nWKID: 4326'
					}
				}
			} catch (err) {
				console.warn('Projection to WGS84 failed:', err);
			}

			text = `${xyCoords}${srWkid}${wgsCoords}`;

		//for not point graphics
		} else {
			//calculates measurements and returns text
			text = _getMeasureText(geometry, parentGraphic);
		}

		const existingMeasureGraphic =
			graphic.measure && graphic.measure.graphic ? graphic.measure.graphic : false;

		//if the graphic exists change it's text and delete relatedSegementLabels
		if (existingMeasureGraphic) {
			if (isTextSymbol(existingMeasureGraphic.symbol)) {
				existingMeasureGraphic.symbol.text = text;
			}
			existingMeasureGraphic.attributes.name = text;
			existingMeasureGraphic.geometry = labelPoint;

			if (!segmentsOn && graphic.attributes.relatedSegmentLabels) {
				drawLayer.removeMany(graphic.attributes.relatedSegmentLabels)
				graphic.attributes.relatedSegmentLabels = []
			}
			// Reorder to ensure it's on top
			drawLayer.remove(existingMeasureGraphic);
			drawLayer.add(existingMeasureGraphic);

		//for new graphics
		} else {
			//copy textSymbol and insert measurement text
			const textSymbol = currentTextSymbol.clone()
			textSymbol.text = text

			//if it's a point offset the text location
			if (isPoint) {
				let lines = 0
				if (xy) {
					lines = -1.5
					if (wkid) {
						lines -= .75
					}
				}
				if (latLong) {
					lines -= 1.5
					if (wkid) {
						lines -= .75
					}
				}
				const fontOffset = textSymbol.font.size * lines
				textSymbol.yoffset = fontOffset
			}

			//add halo if no halo
			if (!textSymbol.haloSize) {
				textSymbol.haloSize = 2
				textSymbol.haloColor = 'white'
			} 

			//make any background color transparent
			if (textSymbol.backgroundColor?.a > 0) {
				textSymbol.backgroundColor.a = 0
			}

			//create measurement label graphic and add it to map
			const labelGraphic = new Graphic({
				geometry: labelPoint,
				symbol: textSymbol,
				attributes: {
					name: text,
					description: isPoint ? 'Coordinate Label' : 'Measurement Label',
					isMeasurementLabel: true,   // ✅ Essential for filtering
					hideFromList: true,         // ✅ Exclude from My Drawings
					drawMode: 'text'            // ✅ Ensures edit UI classifies it properly
				},
			}) as ExtendedGraphic;

			drawLayer.add(labelGraphic);

			//associate label graphic with a drawing
			labelGraphic.measureParent = graphic;
			graphic.measure = {
				graphic: labelGraphic,
				lengthUnit: distanceUnit.unit,
				areaUnit: areaUnit,
			};

			//if its a segment label associate it in the relatedSegmentLabels
			if (parentGraphic) {
				if (parentGraphic.attributes.relatedSegmentLabels) {
					parentGraphic.attributes.relatedSegmentLabels.push(labelGraphic)
				} else {
					parentGraphic.attributes.relatedSegmentLabels = [labelGraphic]
				}
			}
		}
		setCurrentGraphic(graphic)
		return true;
	};

	//calculate measurements and return a text value
	const _getMeasureText = (geometry, parentGraphic, customDistanceUnit = null, customAreaUnit = null, graphic = null) => {
		if (!geometry) return '';

		try {
			const currentDistanceUnit = customDistanceUnit || distanceUnit.unit;
			const currentAreaUnit = customAreaUnit || areaUnit.unit;
			switch (geometry.type) {

				case 'polyline': {
					// Calculate length for polylines
					const length = _calculatePolylineLength(geometry);

					// Format the length with the appropriate unit
					const lengthUnitInfo = availableDistanceUnits.find(u => u.unit === currentDistanceUnit);
					const lengthUnitLabel = lengthUnitInfo ? lengthUnitInfo.abbreviation : currentDistanceUnit;

					// Use configured pattern or default
					let polylinePattern = lengthOn ? props.config.measurePolylineLabel || '{{length}} {{lengthUnit}}' : '';
					if (segmentsOn) {
						polylinePattern = 'Total: ' + polylinePattern
					}
					if (parentGraphic) {
						polylinePattern = props.config.measurePolylineLabel || '{{length}} {{lengthUnit}}';
					}
					// Replace placeholders with actual values
					return polylinePattern
						.replace(/{{length}}/g, _round(length, otherRound).toLocaleString())
						.replace(/{{lengthUnit}}/g, lengthUnitLabel);
				}

				case 'polygon': {
					const area = _calculatePolygonArea(geometry)
					const perimeter = _calculatePolygonPerimeter(geometry);

					// Get appropriate unit labels
					const areaUnitInfo = areaUnits.find(u => u.unit === currentAreaUnit);
					const areaUnitLabel = areaUnitInfo ? areaUnitInfo.abbreviation : currentAreaUnit;

					const perimeterUnitInfo = availableDistanceUnits.find(u => u.unit === currentDistanceUnit);
					const perimeterUnitLabel = perimeterUnitInfo ? perimeterUnitInfo.abbreviation : currentDistanceUnit;

					// Use configured pattern or default
					let defaultPattern = ''
					if (areaOn && perimeterOn) {
						defaultPattern = 'Area: {{area}} {{areaUnit}}\nPerimeter: {{length}} {{lengthUnit}}'
					} else if (areaOn) {
						defaultPattern = 'Area: {{area}} {{areaUnit}}'
					} else if (perimeterOn) {
						defaultPattern = 'Perimeter: {{length}} {{lengthUnit}}'
					}
					const polygonPattern = props.config.measurePolygonLabel || defaultPattern;

					// Replace placeholders with actual values
					let result = polygonPattern
						.replace(/{{area}}/g, _round(area, otherRound).toLocaleString())
						.replace(/{{areaUnit}}/g, areaUnitLabel)
						.replace(/{{length}}/g, _round(perimeter, otherRound).toLocaleString())
						.replace(/{{lengthUnit}}/g, perimeterUnitLabel);

					// Add radius if this is a circle
					if (geometry.rings[0].length === 61 && radiusOn) {
						const radius = perimeter / (2 * Math.PI);
						result += `\nRadius: ${_round(radius, otherRound).toLocaleString()} ${perimeterUnitInfo.abbreviation}`;
					}

					return result;
				}

				default:
					console.warn(`Unsupported geometry type for measurement: ${geometry.type}`);
					return '';
			}
		} catch (error) {
			console.error('Error calculating measurement:', error);
			return 'Error calculating measurement';
		}
	};

	//find length of line
	const _calculatePolylineLength = (polyline) => {
		let totalLength = 0;
		try {
			//if webMecator or WGS84 use geodeticOperator else use planer calculation
			if (polyline.spatialReference.isWGS84 || polyline.spatialReference.isWebMercator) {
				//console.log('isWGS84 or web mercator')
				totalLength = geodeticLengthOperator.execute(polyline, { unit: 'meters' })
			} else {
				totalLength = lengthOperator.execute(polyline, { unit: 'meters' })
			}
			//convert calculation in meters to desired unit
			return _convertLength(totalLength, distanceUnit);
		} catch (error) {
			console.error('Error calculating polyline length:', error);
			return 0;
		}
	};

	//find perimeter
	const _calculatePolygonPerimeter = (polygon) => {
		let perimeter = 0;
		try {
			//double loop to calculate length of each line segment and add to total
			for (let i = 0; i < polygon.rings.length; i++) {
				const pointArray = polygon.rings[i]
				for (let j = 1; j < pointArray.length; j++) {
					const tempGraphic = makeTempLineGraphic(pointArray[j - 1], pointArray[j], polygon)
					if (polygon.spatialReference.isWGS84 || polygon.spatialReference.isWebMercator) {
						//console.log('isWGS84 or web mercator')
						perimeter += geodeticLengthOperator.execute(tempGraphic.geometry, { unit: 'meters' })
					} else {
						perimeter += lengthOperator.execute(polygon, { unit: 'meters' })
					}
				}
			}
			// Apply unit conversion
			return _convertLength(perimeter, distanceUnit);
		} catch (error) {
			console.error('Error calculating polygon perimeter:', error);
			return 0;
		}
	};

	//find area
	const _calculatePolygonArea =  (polygon) => {
		let area = 0;
		try {
			//if webMecator or WGS84 use geodeticOperator else use planer calculation
			if (polygon.spatialReference.isWGS84 || polygon.spatialReference.isWebMercator) {
				//console.log('isWGS84 or web mercator')
				area = geodeticAreaOperator.execute(polygon, { unit: 'square-meters' })
			} else {
				area = areaOperator.execute(polygon, { unit: 'square-meters' })
			}
			//convert calculation in meters to desired unit
			return _convertArea(area, areaUnit);
		} catch (error) {
			console.error('Error calculating polygon area:', error);
			return 0;
		}
	};

	// convert length to desired unit
	const _convertLength = (length, unit) => {
		// Default to meters if unit not found
		const factor = unit.conversion || 1;
		return length * factor;
	};

	//convert area to desired unit
	const _convertArea = (area, unit) => {
		// Default to square meters if unit not found
		const factor = unit.conversion || 1;
		return area * factor;
	};

	//round output to desired decimals
	const _round = (number, decimals = 0) => {
		return Number(number.toFixed(decimals))
	}

	//makes an invisible copy of a line segment for calculating distance and placing text
	const makeTempLineGraphic = (point1, point2, geometry) => {
		const tempLine = new Polyline({
			paths: [[point1, point2]],
			spatialReference: geometry.spatialReference
		})
		const tempGraphic = new Graphic({
			geometry: tempLine,
			symbol: {
				type: 'simple-line'
			},
			visible: false
		})
		return tempGraphic
	}

	//creates event listeners for adding changing and deleting measurements
	const liveMeasure = () => {
		if (sketchViewModel) {
			//runs when graphic updated
			const newUpdateListener = sketchViewModel.on('update', (event) => {
				//update measurements for existing graphics
				if (measureEnabled || event.graphics[0].measure) {
					const graphic = event.graphics[0]
					const geometry = graphic.geometry
					_addMeasurement(graphic)
					//when done updating if segments are on calculate segments
					if (event.state === 'complete' && segmentsOn && (geometry.type === 'polygon' || geometry.type === 'polyline')) {
						const pathsOrRings = geometry.paths || geometry.rings
						//remove old measurements
						if (graphic.attributes.relatedSegmentLabels) {
							drawLayer.removeMany(graphic.attributes.relatedSegmentLabels)
							graphic.attributes.relatedSegmentLabels = []
						}
						//double loop for calculating segments
						for (let i = 0; i < pathsOrRings.length; i++) {
							const pointArray = pathsOrRings[i]
							//make a templine for each segment and add a measurement for it
							for (let j = 1; j < pointArray.length; j++) {
								const tempGraphic = makeTempLineGraphic(pointArray[j - 1], pointArray[j], geometry)
								_addMeasurement(tempGraphic, graphic)
							}
						}
					}
				}
			})
			//runs when graphic created
			const newCreateListener = sketchViewModel.on('create', (event) => {
				//do nothing on cancel and start, else make a measurement
				if (measureEnabled && event.state !== 'cancel' && event.state !== 'start') {
					const graphic = event.graphic
					_addMeasurement(graphic)
					const geometry = graphic.geometry
					//when vertex added to a polyline with segments on calculate its length
					if (event.toolEventInfo && event.toolEventInfo.type === 'vertex-add' && segmentsOn && geometry.type === 'polyline') {
						//line must have at least two points
						if (geometry.paths[0].length > 1) {
							const lastPoint = geometry.paths[0][geometry.paths[0].length - 1]
							const nextToLastPoint = geometry.paths[0][geometry.paths[0].length - 2]
							const tempGraphic = makeTempLineGraphic(nextToLastPoint, lastPoint, geometry)
							_addMeasurement(tempGraphic, graphic)
						}
					}
					//if done drawing with segments on
					if (event.state === 'complete' && segmentsOn && (geometry.type === 'polygon' || geometry.type === 'polyline') && event.tool !== 'circle') {
						//remove and re-add segments to place over line
						if (geometry.type === 'polyline') {
							drawLayer.removeMany(graphic.attributes.relatedSegmentLabels)
							drawLayer.addMany(graphic.attributes.relatedSegmentLabels)
						//calculate polygon segments
						} else {
							const rings = geometry.rings
							for (let i = 0; i < rings.length; i++) {
								const ring = rings[i]
								for (let j = 1; j < ring.length; j++) {
									const tempGraphic = makeTempLineGraphic(ring[j - 1], ring[j], geometry)
									_addMeasurement(tempGraphic, graphic)
								}
							}
						}	
					}
				}
			})
			//if graphic deleted delete measurement
			sketchViewModel.on('delete', (event) => {
				const graphic = event.graphics[0]
				if (graphic.measure) {
					drawLayer.remove(graphic.measure.graphic)
				}
				if (graphic.attributes.relatedSegmentLabels) {
					drawLayer.removeMany(graphic.attributes.relatedSegmentLabels)
				}
			})
			setUpdateListener(newUpdateListener)
			setCreateListener(newCreateListener)
		}
	}

    return (
		<div
			className='drawToolbarDiv'
		>
			<div className='d-flex flex-column'>
				{showTextPreview ?
					<></>
					: <CollapsableCheckbox
						label={drawLayer?.graphics?.length < 1 ? 'Enable Measurements' : measureEnabled ? 'Measurements [Adding Measurements]' : 'Measurements [Removing Measurements]'}
						onCheckedChange={() => setMeasureEnabled(!measureEnabled)}
						disableActionForUnchecked
						openForCheck
						closeForUncheck
						className='w-100'
					>
						<div className='d-flex flex-column'>
							{toolType === 'point' || toolType === '' || toolType === 'text' ?
								<></>
								:<Label className='drawToolbarDiv'>
									Linear Units:
									<Select
										title='Linear Units'
										onChange={(e) => setDistanceUnit(e.target.value)}
										defaultValue={availableDistanceUnits[props.config.defaultDistance]}
									>
										{availableDistanceUnits.map((unit) => {
											return (
												<Option
													value={unit}
												>
													{unit.label + " (" + unit.abbreviation + ")"}
												</Option>
											)
										})}
									</Select>
								</Label>
							}
							{toolType === 'point' || toolType === 'polyline' || toolType === 'freepolyline' || toolType === '' || toolType === 'text' ?
								<></>
								:<Label className='drawToolbarDiv'>
									Area Units:
									<Select
										title='Area Units'
										onChange={(e) => setAreaUnit(e.target.value)}
										defaultValue={availableAreaUnits[props.config.defaultArea]}
									>
										{availableAreaUnits.map((unit) => {
											return (
												<Option
													value={unit}
												>
													{unit.label + " (" + unit.abbreviation + ")"}
												</Option>
											)
										})}
									</Select>
								</Label>
							}
							{toolType === 'point' ?
								<div>
									<div
										className='d-flex justify-content-center'
									>
										<Label
											centric
										>
											<Checkbox
												className='mr-2 mt-2 mb-2 ml-4'
												checked={xy}
												onChange={() => setXy(!xy)}
											/>
											XY
										</Label>
										<Label
											centric
										>
											<Checkbox
												className='mr-2 mt-2 mb-2 ml-4'
												checked={latLong}
												onChange={() => setLatLong(!latLong)}
											/>
											Lat/Long
										</Label>
										{xy || latLong ?
											<Label
												centric
											>
												<Checkbox
													className='mr-2 mt-2 mb-2 ml-4'
													checked={wkid}
													onChange={() => setWkid(!wkid)}
												/>
												WKID
											</Label>
											: <></>
										}
									</div>
									<Label
										centric
										className='d-flex justify-content-center'
									>
										Decimal Places:
										<NumericInput
											className='decimalInput ml-2'
											size='sm'
											max={10}
											min={0}
											step={1}
											value={pointRound}
											onChange={(value) => setPointRound(value)}
										/>
									</Label>
								</div>
								:<></>
							}
							{toolType === 'polyline' || toolType === 'freepolyline' ?
								<div>
									<div
										className='d-flex justify-content-center'
									>
										<Label
											centric
										>
											<Checkbox
												className='mr-2 mt-2 mb-2 ml-4'
												checked={lengthOn}
												onChange={() => setLengthOn(!lengthOn)}
											/>
											Length
										</Label>
										<Label
											centric
										>
											<Checkbox
												className='mr-2 mt-2 mb-2 ml-4'
												checked={segmentsOn}
												onChange={() => setSegmentsOn(!segmentsOn)}
											/>
											Line Segments
										</Label>
									</div>
									<Label
										centric
										className='d-flex justify-content-center'
									>
										Decimal Places:
										<NumericInput
											className='decimalInput ml-2'
											size='sm'
											max={10}
											min={0}
											step={1}
											value={otherRound}
											onChange={(value) => setOtherRound(value)}
										/>
									</Label>
									{toolType === 'freepolyline' ?
										<Alert
											className='w-100'
										>
											Line Segments not recommended for freehand tools.
										</Alert>
										: <></>
									}
								</div>
								: <></>
							}
							{toolType === 'polygon' || toolType === 'freepolygon' || toolType === 'circle' ?
								<div>
									<div
										className='d-flex justify-content-center'
									>
										<Label
											centric
										>
											<Checkbox
												className='mr-2 mt-2 mb-2 ml-4'
												checked={areaOn}
												onChange={() => setAreaOn(!areaOn)}
											/>
											Area
										</Label>
										<Label
											centric
										>
											<Checkbox
												className='mr-2 mt-2 mb-2 ml-4'
												checked={perimeterOn}
												onChange={() => setPerimeterOn(!perimeterOn)}
											/>
											Perimeter
										</Label>
										{toolType === 'circle' ?
											<Label
												centric
											>
												<Checkbox
													className='mr-2 mt-2 mb-2 ml-4'
													checked={radiusOn}
													onChange={() => setRadiusOn(!radiusOn)}
												/>
												Radius
											</Label>
											: <></>
										}
										{toolType === 'polygon' || toolType === 'freepolygon' ?
											<Label
												centric
											>
												<Checkbox
													className='mr-2 mt-2 mb-2 ml-4'
													checked={segmentsOn}
													onChange={() => setSegmentsOn(!segmentsOn)}
												/>
												Line Segments
											</Label>
											: <></>
										}
									</div>
									<Label
										centric
										className='d-flex justify-content-center'
									>
										Decimal Places:
										<NumericInput
											className='decimalInput ml-2'
											size='sm'
											max={10}
											min={0}
											step={1}
											value={otherRound}
											onChange={(value) => setOtherRound(value)}
										/>
									</Label>
									{toolType === 'freepolygon' ?
										<Alert
											className='w-100'
										>
											Line Segments not recommended for freehand tools.
										</Alert>
										: <></>
									}
								</div>
								: <></>
							}
						</div>
					</CollapsableCheckbox>
				}
				<CollapsableCheckbox
					onCheckedChange={() => setTooltips(!tooltips)}
					disableActionForUnchecked
					openForCheck
					closeForUncheck
					label={tooltips ? 'Disable Tooltips' : 'Enable Tooltips'}
				>
					<div className='ml-3 mt-2 mb-2'>
						<ul className='text-dark m-0 pl-3 small'>
							<li>Press <strong>Tab</strong> to manually enter values.</li>
						</ul>
					</div>
				</CollapsableCheckbox>
			</div>
		</div>
    )
}

export default Measure