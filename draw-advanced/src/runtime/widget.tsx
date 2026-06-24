/** @jsx jsx */
import {React, AllWidgetProps, jsx, WidgetState} from 'jimu-core';
import {IMConfig, DrawMode} from '../config';
import {Icon, Button, TextInput, NumericInput, Switch, TextAlignValue, Popper, Checkbox, 
	Slider, Label, defaultMessages, AdvancedButtonGroup, Select, Option, CollapsablePanel
} from 'jimu-ui';
import { TrashOutlined } from 'jimu-icons/outlined/editor/trash';
import { ArrowRedoOutlined } from 'jimu-icons/outlined/directional/arrow-redo'
import { ArrowUndoOutlined } from 'jimu-icons/outlined/directional/arrow-undo'
import { WrongOutlined } from 'jimu-icons/outlined/suggested/wrong'
import { CloseOutlined } from 'jimu-icons/outlined/editor/close'
import {JimuMapView, JimuMapViewComponent} from 'jimu-arcgis';
import {getStyle} from './lib/style';
import defMessages from './translations/default';
import SketchViewModel from "esri/widgets/Sketch/SketchViewModel";
import {SymbolSelector, JimuSymbolType} from 'jimu-ui/advanced/map';
import {InputUnit} from 'jimu-ui/advanced/style-setting-components';
import { ColorPicker } from 'jimu-ui/basic/color-picker';
import Color from '@arcgis/core/Color';
import GraphicsLayer from "esri/layers/GraphicsLayer";
import Graphic from "esri/Graphic";
import TextSymbol  from "esri/symbols/TextSymbol";
import hAlignLeft from 'jimu-icons/svg/outlined/editor/text-left.svg';
import hAlignCenter from 'jimu-icons/svg/outlined/editor/text-center.svg';
import hAlignRight from 'jimu-icons/svg/outlined/editor/text-right.svg';
import esriColor from 'esri/Color';
import './widget.css'
import Measure from './components/measure'
import { MyDrawingsPanel } from './components/MyDrawingsPanel'; // Added BM
import { SnappingControls } from './components/SnappingControls';
import { Tabs, Tab } from 'jimu-ui'; // Added BM

const pinIcon = require('./assets/pin.svg');
const curveIcon = require('./assets/curve.svg');
const lineIcon = require('./assets/polygonal.svg');
const rectIcon = require('./assets/rectangle.svg');
const polyIcon = require('./assets/polygon.svg');
const freePolyIcon = require('./assets/irregular.svg');
const circleIcon = require('./assets/circle.svg');
const textIcon = require('./assets/text.svg');
const vAlignTop = require('./assets/text-align-v-t.svg');
const vAlignBot = require('./assets/text-align-v-b.svg');
const vAlignMid = require('./assets/text-align-v-m.svg');
const vAlignBase = require('./assets/text-align-v-base.svg');
const fsBoldIcon = require('./assets/bold.svg');
const fItalicIcon = require('./assets/italic.svg');
const fUnderlineIcon = require('./assets/underline.svg');

interface States {
  currentJimuMapView: JimuMapView;
  graphics?: any[];
  pointBtnActive: boolean;
  lineBtnActive: boolean;
  flineBtnActive: boolean;
  rectBtnActive: boolean;
  polygonBtnActive: boolean;
  fpolygonBtnActive: boolean,
  circleBtnActive: boolean;
  undoBtnActive: boolean;
  redoBtnActive: boolean;
  clearBtnActive: boolean;
  textBtnActive: boolean;
  showSymPreview: boolean;
  showTextPreview: boolean;
  currentSymbol: any;
  currentSymbolType: JimuSymbolType;
  currentTextSymbol: TextSymbol;
  drawGLLengthcheck: boolean;
  currentTool: 'point' | 'polyline' | 'freepolyline' | 'extent' | 'polygon' | 'circle' | 'freepolygon' | 'text' | '';
  clearBtnTitle: string;
  canUndo: boolean;
  canRedo: boolean;
  textSymPreviewText: string;
  fontColor: string;
  fontSize: string;
  fontHaloSize: number;
  fontHaloColor: string;
  fontHaloEnabled: boolean;
  fontHalo: string;
  fontWeight: string;
  fontDecoration: string;
  fontStyle: string;
  hTextAlign: TextAlignValue;
  vTextAlign: "baseline"|"top"|"middle"|"bottom";
  fontRotation: number;
  vAlignBaseBtnActive: boolean;
  vAlignTopBtnActive: boolean;
  vAlignMidBtnActive: boolean;
  vAlignBotBtnActive: boolean;
  textPreviewHeight: number;
  hAlignLeftBtnActive: boolean;
  hAlignCenterBtnActive: boolean;
  hAlignRightBtnActive: boolean;
  fsBoldBtnActive: boolean;
  fsItalicBtnActive: boolean;
  fsUnderlineBtnActive: boolean;
  widgetInit: boolean;
  textPreviewisOpen: boolean;
  fontOpacity: number;
  fontHaloOpacity: number;
  textHasChanged: boolean;
	rotationMode: boolean;
	drawLayerTitle: string;
	listMode: string;
	confirmDelete: boolean;
	fontBackgroundColor: string | null | esriColor;
	showDrawingsPanel: boolean; // Added BM
	selectedDrawingIndex: number | null; // Added BM
	activeTab: 'draw' | 'mydrawings'; // Added BM
}

export default class Widget extends React.PureComponent<AllWidgetProps<IMConfig>, States> {
  textPreviewSpan: React.RefObject<HTMLSpanElement> = React.createRef();
  sketchViewModel: SketchViewModel;
  drawLayer: GraphicsLayer = null;
  Graphic: typeof __esri.Graphic = null;
  creationMode: DrawMode;
  currentSymbol: __esri.SimpleMarkerSymbol | __esri.PictureMarkerSymbol | __esri.PointSymbol3D | __esri.SimpleFillSymbol | __esri.PolygonSymbol3D | __esri.SimpleLineSymbol | __esri.LineSymbol3D;

	private renderSymbolSelectorSection() {
		const { currentSymbol, currentSymbolType, rotationMode } = this.state;

		return (
			<div>
				<h6 className='mr-3'>Change symbol style:</h6>
				<div className="myss border">
					<SymbolSelector
						symbol={currentSymbol}
						jimuSymbolType={currentSymbolType}
						btnSize={'default'}
						onPopperToggle={this.onSymbolPopper}
						onPointSymbolChanged={this.onPointSymChanged}
						onPolygonSymbolChanged={this.onPolygonSymbolChanged}
						onPolylineSymbolChanged={this.onPolylineSymbolChanged}
						theme={this.props.theme}
					/>
				</div>
				{rotationMode &&
					<div>
						<h6 className='mt-2'>Rotate Point Symbol:</h6>
						<div className='w-100 d-flex'>
							<NumericInput
								size='sm'
								value={this.state.currentSymbol.angle}
								min={0}
								max={360}
								step={.1}
								onChange={(e) => this.handlePointRotation(e)}
								className='mr-2'
							/>
							<span>0°</span>
							<Slider
								value={this.state.currentSymbol.angle}
								min={0}
								max={360}
								step={.1}
								onChange={(e) => this.handlePointRotation(e)}
								className='mr-2 ml-2'
							/>
							<span>360°</span>
						</div>
					</div>
				}
			</div>
		);
	}

	private renderTextSymbolPreviewButton() {
		const { fontColor, fontSize, fontWeight, fontStyle, fontDecoration, fontRotation, fontHalo, currentTextSymbol } = this.state;

		return (
			<div>
				<h6 className='mr-3'>Change text options:</h6>
				<div className="myss">
					<div className="jimu-symbol-selector">
						<Button
							size='sm'
							type='default'
							onClick={this.showTextSymbolPopper}
							id={this.props.widgetId + '_btnTextSymbol'}
							style={{ width: '100%', height: '36px', padding: '0', backgroundColor: currentTextSymbol.backgroundColor}}
						>
							<span className='icon-btn-sizer'>
								<div className="justify-content-center align-items-center symbol-wapper outer-preview-btn d-flex">
									<div className="w-100 h-100 justify-content-center d-flex align-items-center symbol-item text-symbol-item" >
										<span className='text-symbol-span' style={{
											color: fontColor,
											fontSize: `${fontSize}px`,
											fontWeight,
											fontStyle,
											fontFamily: currentTextSymbol.font.family,
											textDecoration: fontDecoration,
											zIndex: 100,
											WebkitTransform: `rotate(${fontRotation}deg)`
										}}>
											{currentTextSymbol.text}
										</span>
										<span style={{
											color: fontColor,
											fontSize: `${fontSize}px`,
											WebkitTextStroke: fontHalo,
											fontWeight,
											fontStyle,
											fontFamily: currentTextSymbol.font.family,
											textDecoration: fontDecoration,
											position: 'absolute',
											WebkitTransform: `rotate(${fontRotation}deg)`
										}}>
											{currentTextSymbol.text}
										</span>
									</div>
								</div>
							</span>
						</Button>
					</div>
				</div>
			</div>
		);
	}

	private renderTextPopper() {
		return (
			<Popper
				open={true}
				reference={this.props.widgetId + '_btnTextSymbol'}
				placement={'bottom'}
				showArrow={true}
				zIndex={1002}
				toggle={this.showTextSymbolPopper}>
				<div className='p-3 d-flex'>
					<div>
						<div className="w-100 d-flex mt-2 mb-3">
							<div className="justify-content-start d-flex align-items-center mr-4 pl-2">{this.nls('preview')}</div>
							<div className="justify-content-center d-flex mt-1 mb-1 ml-3" style={{ height: `${this.state.textPreviewHeight}px`, maxHeight: '220px', backgroundColor: this.state.fontBackgroundColor }}>
								<div>
									<div className="w-100 h-100 justify-content-center d-flex align-items-center symbol-item text-symbol-item" >
										<span className='text-symbol-span' style={{
											color: `${this.state.fontColor}`, fontSize: `${this.state.fontSize}px`,
											fontWeight: this.state.fontWeight === 'normal' ? 'normal' : 'bold', fontStyle: this.state.fontStyle, fontFamily: this.state.currentTextSymbol.font.family,
											textDecoration: this.state.fontDecoration, zIndex: 100, WebkitTransform: `rotate(${this.state.fontRotation}deg)`,
											MozTransition: `rotate(${this.state.fontRotation}deg)`,
											filter: `progid:DXImageTransform.Microsoft.BasicImage(rotation=${this.state.fontRotation})`
										}}>
											{this.state.textSymPreviewText}</span>
										<span style={{
											color: `${this.state.fontColor}`, fontSize: `${this.state.fontSize}px`, WebkitTextStroke: `${this.state.fontHalo}`,
											fontWeight: this.state.fontWeight === 'normal' ? 'normal' : 'bold', fontStyle: this.state.fontStyle, fontFamily: this.state.currentTextSymbol.font.family,
											textDecoration: this.state.fontDecoration, position: 'absolute', WebkitTransform: `rotate(${this.state.fontRotation}deg)`, 
											MozTransition: `rotate(${this.state.fontRotation}deg)`,
											filter: `progid:DXImageTransform.Microsoft.BasicImage(rotation=${this.state.fontRotation})`
										}}>{this.state.textSymPreviewText}</span>
									</div>
								</div>
							</div>
						</div>
						<div className="w-100">
							<div className='w-100 d-flex justify-content-between align-items-center pb-2' >
								<TextInput className='w-100' size='sm' title={this.nls('drawText')} onChange={e => this.TextOnChange(e)} placeholder='Your Text Here' value={this.state.textHasChanged ? this.state.textSymPreviewText : ''} style={{ fontFamily: this.state.currentTextSymbol.font.family }}></TextInput>
							</div>
						</div>
						<div className='w-100 d-flex'>
							Font:
							<Select
								size='sm'
								onChange={(e) => this.handleFontFamily(e)}
								className='ml-2'
								value={this.state.currentTextSymbol.font.family}
							>
								<Option
									value='Alegreya'
									style={{ fontFamily: 'Alegreya' }}
								>
									Alegreya
								</Option>
								<Option
									value='Arial'
									style={{ fontFamily: 'Arial' }}
								>
									Arial
								</Option>
								<Option
									value='Avenir Next LT Pro'
									style={{ fontFamily: 'Avenir Next LT Pro' }}
								>
									Avenir Next
								</Option>
								<Option
									value='Josefin Slab'
									style={{ fontFamily: 'Josefin Slab' }}
								>
									Josefin Slab
								</Option>
								<Option
									value='Merriweather'
									style={{ fontFamily: 'Merriweather' }}
								>
									Merriweather
								</Option>
								<Option
									value='Montserrat'
									style={{ fontFamily: 'Montserrat' }}
								>
									Montserrat
								</Option>
								<Option
									value='Noto Sans'
									style={{ fontFamily: 'Noto Sans' }}
								>
									Noto Sans
								</Option>
								<Option
									value='Noto Serif'
									style={{ fontFamily: 'Noto Serif' }}
								>
									Noto Serif
								</Option>
								<Option
									value='Playfair Display'
									style={{ fontFamily: 'Playfair Display' }}
								>
									Playfair Display
								</Option>
								<Option
									value='Roboto'
									style={{ fontFamily: 'Roboto' }}
								>
									Roboto
								</Option>
								<Option
									value='Ubuntu'
									style={{ fontFamily: 'Ubuntu' }}
								>
									Ubuntu
								</Option>
							</Select>
						</div>
						<div className="w-100">
							<div className='w-100 d-flex justify-content-between align-items-center mb-2' >
								<ColorPicker className="fontcolorpicker" title={this.nls('fontColor')} style={{ padding: '0' }} width={26} height={26}
									color={this.state.fontColor ? this.state.fontColor : 'rgba(0,0,0,1)'}
									onChange={this.updateTextColor} onClick={e => { this.onColorPickerToggle(e) }}></ColorPicker>
								<NumericInput size='sm' onChange={this.fontSizeOnChange}
									value={this.state.fontSize} className="fontsizeinput" style={{ width: '5rem' }}
									showHandlers={true} min={1} max={120}></NumericInput>
								<div style={{ borderRight: '1px solid rgb(182, 182, 182)', height: '26px' }} />
								<AdvancedButtonGroup>
									<Button icon={true} size='sm' active={this.state.fsBoldBtnActive}
										onClick={(evt) => { this.onFontStyleChange(evt, 'bold') }} title={this.nls('fontBold')}><Icon icon={fsBoldIcon} size={'m'} /></Button>
									<Button icon={true} size='sm' active={this.state.fsItalicBtnActive}
										onClick={(evt) => { this.onFontStyleChange(evt, 'italic') }} title={this.nls('fontItalic')}><Icon icon={fItalicIcon} size={'m'} /></Button>
									<Button icon={true} size='sm' active={this.state.fsUnderlineBtnActive}
										onClick={(evt) => { this.onFontStyleChange(evt, 'underline') }} title={this.nls('fontUnderline')}><Icon icon={fUnderlineIcon} width={12} /></Button>
								</AdvancedButtonGroup>
							</div>
						</div>
						<Label>Opacity:
							<div className='w-100 d-flex justify-content-between align-items-center mb-2 border'>
								<Slider
									size='default'  // ✔ valid values: 'default' or 'lg'
									value={this.state.fontOpacity}
									min={0}
									max={1}
									step={0.1}
									hideThumb={false}
									className='mr-2'
									style={{ width: 'calc(100% - 80px)' }}
									title={`${this.props.intl.formatMessage({
										id: 'drawToolOpacity',
										defaultMessage: defaultMessages.drawToolOpacity
									})}: ${100 * this.state.fontOpacity}%`}
									onChange={(e) => this.updateSymbolOpacity(e.currentTarget.value)}
								/>
								<InputUnit
									value={`${100 * this.state.fontOpacity}%`}
									className='input-unit'
									onChange={(e) => this.onOpacityInputChanged(e)}
									style={{ width: '70px' }}
								/>
							</div>
						</Label>
						<div className="w-100">
							<div className='w-100 d-flex justify-content-around align-items-center mb-2' >
								<span>Text Rotation:</span>
								<NumericInput size='sm' onChange={this.fontRotationChange}
									value={this.state.fontRotation} className="fontrotationinput" style={{ width: '80px' }}
									showHandlers={true} min={-360} max={360}></NumericInput>
							</div>
						</div>
						<div className="w-100">
							<div className='w-100 d-flex justify-content-between align-items-center mb-2' >
								<AdvancedButtonGroup>
									<Button icon={true} size='sm' active={this.state.hAlignLeftBtnActive}
										onClick={(evt) => { this.onHorizFontAlignChange(evt, 'left') }} title={this.nls('fontHAleft')}><Icon icon={hAlignLeft} size={'m'} /></Button>
									<Button icon={true} size='sm' active={this.state.hAlignCenterBtnActive}
										onClick={(evt) => { this.onHorizFontAlignChange(evt, 'center') }} title={this.nls('fontHAcenter')}><Icon icon={hAlignCenter} size={'m'} /></Button>
									<Button icon={true} size='sm' active={this.state.hAlignRightBtnActive}
										onClick={(evt) => { this.onHorizFontAlignChange(evt, 'right') }} title={this.nls('fontHAright')}><Icon icon={hAlignRight} size={'m'} /></Button>
								</AdvancedButtonGroup>
								<div style={{ borderRight: '1px solid rgb(182, 182, 182)', height: '26px' }} />
								<AdvancedButtonGroup>
									<Button icon={true} size='sm' active={this.state.vAlignBaseBtnActive}
										onClick={(evt) => { this.onVertFontAlignChange(evt, 'baseline') }} title={this.nls('fontVAbase')}><Icon icon={vAlignBase} currentColor={true} /></Button>
									<Button icon={true} size='sm' active={this.state.vAlignTopBtnActive}
										onClick={(evt) => { this.onVertFontAlignChange(evt, 'top') }} title={this.nls('fontVAtop')}><Icon icon={vAlignTop} /></Button>
									<Button icon={true} size='sm' active={this.state.vAlignMidBtnActive}
										onClick={(evt) => { this.onVertFontAlignChange(evt, 'middle') }} title={this.nls('fontVAmid')}><Icon icon={vAlignMid} /></Button>
									<Button icon={true} size='sm' active={this.state.vAlignBotBtnActive}
										onClick={(evt) => { this.onVertFontAlignChange(evt, 'bottom') }} title={this.nls('fontVAbottom')}><Icon icon={vAlignBot} /></Button>
								</AdvancedButtonGroup>
							</div>
						</div>
						<Label centric>
							Background Color:
							<ColorPicker className='mr-4 ml-2' style={{ padding: '0' }} width={26} height={26} type='icon-only' icon={this.state.fontBackgroundColor === 'rgba(0,0,0,0)' ? <CloseOutlined title='No Background Color' /> : <div title='Background Color' style={{ backgroundColor: this.state.fontBackgroundColor, height: '100%', width: '100%' }}></div>}
								color={this.state.fontBackgroundColor ? this.state.fontBackgroundColor : "#000000"} onClick={e => { this.onColorPickerToggle(e) }}
								onChange={this.updateBackgroundColor}></ColorPicker>
						</Label>
					</div>
					<div className='ml-2'>
						<div className='border p-2 mb-2'>
							<h6>Text Halo Options</h6>
							<div className="w-100">
								<div className='w-100 d-flex justify-content-between align-items-center mb-2' >
									<Label centric>{this.state.fontHaloEnabled ? 'Disable' : 'Enable'}
										<Switch title={this.nls('enableFontHalo')} className="mr-4 ml-2" onChange={this.fontHaloChkChange} checked={this.state.fontHaloEnabled} ></Switch>
									</Label>
									<ColorPicker className='mr-4 fonthalocolorpicker' style={{ padding: '0' }} width={26} height={26}
										color={this.state.fontHaloColor ? this.state.fontHaloColor : '#000000'} onClick={e => { this.onColorPickerToggle(e) }}
										onChange={this.updateFontHaloColor} disabled={!this.state.fontHaloEnabled}></ColorPicker>
									<NumericInput size='sm' onChange={e => this.fontHaloSizeChange(e)}
										value={this.state.fontHaloSize} disabled={!this.state.fontHaloEnabled} className="fonthalosizeinput" style={{ width: '80px' }}
										showHandlers={true} min={1} max={20}></NumericInput>
								</div>
							</div>
							<Label>Opacity:
								<div className='w-100 d-flex justify-content-between align-items-center mb-2 border'>
									<Slider
										size='default'
										value={this.state.fontHaloOpacity}
										min={0}
										max={1}
										step={0.1}
										hideThumb={false}
										className='mr-2'
										style={{ width: 'calc(100% - 80px)' }}
										title={`${this.nls('fontHalo')} ${this.props.intl.formatMessage({
											id: 'drawToolOpacity',
											defaultMessage: defaultMessages.drawToolOpacity
										})}: ${100 * this.state.fontHaloOpacity}%`}
										onChange={(e) => {
											if (this.state.fontHaloEnabled) {
												this.updateSymbolHaloOpacity(e.currentTarget.value);
											}
										}}
									/>
									<InputUnit
										value={`${100 * this.state.fontHaloOpacity}%`}
										className='input-unit'
										onChange={(e) => this.onHaloOpacityInputChanged(e)}
										style={{ width: '70px' }}
										disabled={!this.state.fontHaloEnabled} // ✅ This is valid for InputUnit
									/>
								</div>
							</Label>
						</div>
					</div>
				</div>
			</Popper>
		);
	}

constructor(props) {
	super(props);

	this.state = {
	  currentJimuMapView: null,
	  graphics: [],
	  pointBtnActive: false,
	  lineBtnActive: false,
	  flineBtnActive: false,
	  rectBtnActive: false,
	  polygonBtnActive: false,
	  fpolygonBtnActive: false,
	  circleBtnActive: false,
	  textBtnActive: false,
	  showSymPreview: false,
	  currentSymbol: null,
	  currentSymbolType: null,
	  currentTextSymbol: new TextSymbol({
		  verticalAlignment: 'middle',
		  font: {
			  family: "Avenir Next LT Pro"
			},
		  text: 'Text'
	  }),
	  undoBtnActive: false,
	  redoBtnActive: false,
	  clearBtnActive: false,
	  drawGLLengthcheck: false,
	  currentTool: '',
	  clearBtnTitle: this.nls('drawClear'),
	  canUndo: false,
	  canRedo: false,
	  showTextPreview: false,
	  textSymPreviewText: 'Text',
	  fontColor: 'rgba(0,0,0,1)',
	  fontSize: `${new TextSymbol().font.size?? 14}`,
	  fontHaloSize: 1,
	  fontHaloColor: 'rgba(255,255,255,1)',
	  fontHaloEnabled: false,
	  fontHalo: 'unset',
	  fontWeight: 'normal',
	  fontDecoration: 'none',
	  fontStyle: 'normal',
	  hTextAlign: TextAlignValue.CENTER,
	  vTextAlign: 'middle',
	  fontRotation: 0,
	  vAlignBaseBtnActive: false,
	  vAlignTopBtnActive: false,
	  vAlignMidBtnActive: true,
	  vAlignBotBtnActive: false,
	  textPreviewHeight: 25,
	  hAlignLeftBtnActive: false,
	  hAlignCenterBtnActive: true,
	  hAlignRightBtnActive: false,
	  fsBoldBtnActive: false,
	  fsItalicBtnActive: false,
	  fsUnderlineBtnActive: false,
	  widgetInit: false,
	  textPreviewisOpen: false,
	  fontOpacity: 1,
	  fontHaloOpacity: 1,
	  textHasChanged: false,
		rotationMode: false,
		drawLayerTitle: this.props.config.title,
		listMode: this.props.config.listMode ? 'show' : 'hide',
		confirmDelete: false,
		fontBackgroundColor: 'rgba(0,0,0,0)',
		showDrawingsPanel: false, // Added BM
		selectedDrawingIndex: null, // Added BM
		activeTab: 'draw' // Added BM
	};
	this.creationMode = this.props.config.creationMode || DrawMode.SINGLE;
  }

  nls = (id: string) => {
	return this.props.intl ? this.props.intl.formatMessage({ id: id, defaultMessage: defMessages[id] }) : id;
  }

  componentDidMount() {
	this.setState({widgetInit: true});
	this.drawLayer = new GraphicsLayer({id:"DrawGL", listMode: this.props.config.listMode ? 'show': 'hide', title: this.props.config.title});
  }

  componentDidUpdate() {
	if(this.state.currentJimuMapView){
	  const {view} = this.state.currentJimuMapView
	  let widgetState: WidgetState = this.props.state;
	  if (widgetState === WidgetState.Closed && this.sketchViewModel) {
		  this.sketchViewModel.updateOnGraphicClick = false;
		  if (this.props.config.turnOffOnClose) {
			this.setDrawToolBtnState(null);
		  }
	  } else if (widgetState === WidgetState.Opened && this.sketchViewModel) {
		this.sketchViewModel.updateOnGraphicClick = true;
	  }
	}
	if(document.getElementsByClassName('fontcolorpicker')[0]){
	  (document.getElementsByClassName('fontcolorpicker')[0] as HTMLElement).title = this.nls('fontColor');
	}
	if(document.getElementsByClassName('fontrotationinput')[0]){
	  (document.getElementsByClassName('fontrotationinput')[0] as HTMLElement).title = this.nls('fontRotation');
	}
	if(document.getElementsByClassName('fontsizeinput')[0]){
	  (document.getElementsByClassName('fontsizeinput')[0] as HTMLElement).title = this.nls('fontSize');
	}
	if(document.getElementsByClassName('fonthalocolorpicker')[0]){
	  (document.getElementsByClassName('fonthalocolorpicker')[0] as HTMLElement).title = this.nls('fontHaloColor');
	}
	if(document.getElementsByClassName('fonthalosizeinput')[0]){
	  (document.getElementsByClassName('fonthalosizeinput')[0] as HTMLElement).title = this.nls('fontHaloSize');
	}
  }

  componentWillUnmount(){
	if(this.drawLayer){
	  this.drawLayer.removeAll
	  this.drawLayer = null;
	}
  }

  activeViewChangeHandler = (jimuMapView: JimuMapView) => {
	//Async errors
	if (null === jimuMapView || undefined === jimuMapView) {
	  this.setState({ currentJimuMapView: null });
	  return; //skip null
	}
	this.setState({
	  currentJimuMapView: jimuMapView
	});
	jimuMapView.whenJimuMapViewLoaded().then(()=>{
	  const{map} = jimuMapView.view;
	  if(this.state.widgetInit){
		this.creationMode = this.props.config.creationMode || DrawMode.SINGLE;
		const dLayer: GraphicsLayer = map.findLayerById('DrawGL') as GraphicsLayer;
		if(dLayer){
		  this.drawLayer = dLayer;
		  if(this.drawLayer.graphics.length > 0){
			this.setState({drawGLLengthcheck: true});
		  }
		}else{
		  map.add(this.drawLayer);
		}
	  }
	  this.drawLayer.graphics.watch('length', (len)=>{
		if(len > 0){
		  this.setState({drawGLLengthcheck: true});
		}else{
		  this.setState({drawGLLengthcheck: false});
		}
	  });
	  this.sketchViewModel = new SketchViewModel({
		view: jimuMapView.view,
		updateOnGraphicClick: true,
		layer: this.drawLayer
	  });

	  this.sketchViewModel.on('create', this.svmGraCreate);
	  this.sketchViewModel.on('update', this.svmGraUpdate);
	});
}

	// Added BM 
	toggleDrawingsPanel = () => {
		this.setState({ showDrawingsPanel: !this.state.showDrawingsPanel });
	}

	handleDrawingSelect = (graphic: Graphic, index: number) => {
		// Select the drawing on the map
		this.setState({ selectedDrawingIndex: index });
		
		// Pan to the graphic
		if (this.state.currentJimuMapView) {
			const { view } = this.state.currentJimuMapView;
			if (graphic.geometry) {
				view.goTo(graphic.geometry);
			}
		}

		// Select the graphic for editing
		if (this.sketchViewModel) {
			this.sketchViewModel.update([graphic]);
		}
	}

	handleDrawingsUpdate = (updatedDrawings: Graphic[]) => {
		// This method will be called when drawings are updated from the panel
		// No need to update the drawLayer since the graphics are already there
	}

	showAlert = (message: string, type: 'success' | 'error' | 'info') => {
		// For now just use alert, but you could integrate with a more sophisticated notification system
		console.log(`${type}: ${message}`);
		alert(message);
	}

	//End of BM Add

  svmGraCreate = (evt) => {
	  if (evt.state === "complete") {
		  // Add needed attributes for the My Drawings panel
		  if (!evt.graphic.attributes) {
			  evt.graphic.attributes = {};
		  }

		  // Add a unique ID, name, and created date
		  evt.graphic.attributes.uniqueId = `drawing_${Date.now()}`;
		  evt.graphic.attributes.name = `${this.state.currentTool} ${this.drawLayer.graphics.length + 1}`;
		  evt.graphic.attributes.createdDate = Date.now();
		  evt.graphic.attributes.drawMode = this.state.currentTool;
		  if (this.creationMode === 'continuous') {
			  switch (this.state.currentTool) {
				  case 'extent':
					  this.sketchViewModel.create("rectangle");
					  break;
				  case 'freepolyline':
					  this.sketchViewModel.create("polyline", { mode: 'freehand' });
					  break;
				  case 'polyline':
					  this.sketchViewModel.create("polyline");
					  break;
				  case 'point':
					  this.sketchViewModel.create("point");
					  break;
				  case 'polygon':
					  this.sketchViewModel.create("polygon");
					  break;
				  case 'freepolygon':
					  this.sketchViewModel.create("polygon", { mode: 'freehand' });
					  break;
				  case 'circle':
					  this.sketchViewModel.create("circle");
					  break;
				  case 'text':
					  evt.graphic.symbol = this.state.currentTextSymbol.clone();
					  this.sketchViewModel.create("point");
					  break;
			  }
		  } else if (evt.state === "complete" && this.creationMode === "single") {
			  if (this.state.currentTool === 'text') {
				  evt.graphic.symbol = this.state.currentTextSymbol.clone();
			  }
			  this.setDrawToolBtnState(null);
		  }
	  }
  }

  svmGraUpdate = (evt) => {
	this.setState({
	  canUndo: this.sketchViewModel.canUndo(),
	  canRedo: this.sketchViewModel.canRedo()
	});
	if(evt.state === "start"){
	  if(evt.graphics){
		evt.graphics.map((gra:Graphic)=>{
		  if(gra.geometry.type === 'point' && gra.symbol.type === 'text'){
			const cTextSym:TextSymbol = evt.graphics[0].symbol.clone();
			let cState = {};
			cState['vTextAlign'] = cTextSym.verticalAlignment;
			cState['vAlignBaseBtnActive'] = cTextSym.verticalAlignment==='baseline';
			cState['vAlignTopBtnActive'] = cTextSym.verticalAlignment==='top';
			cState['vAlignMidBtnActive'] = cTextSym.verticalAlignment==='middle';
			cState['vAlignBotBtnActive'] = cTextSym.verticalAlignment==='bottom';
			cState['hTextAlign'] = cTextSym.horizontalAlignment;
			cState['hAlignLeftBtnActive'] = cTextSym.horizontalAlignment==='left';
			cState['hAlignCenterBtnActive'] = cTextSym.horizontalAlignment==='center';
			cState['hAlignRightBtnActive'] = cTextSym.horizontalAlignment==='right';
			cState['fontRotation'] = cTextSym.angle;
			cState['showSymPreview'] = false;
			cState['showTextPreview'] = true;
			cState['currentSymbol'] = null;
			cState['currentSymbolType'] = null;
			cState['currentTextSymbol'] = cTextSym;
			cState['graphics'] = evt.graphics;
			cState['clearBtnTitle'] = this.nls('drawClearSelected');
			cState['fontColor'] = this.convertSymbolColorToColorPickerValue(cTextSym.color);
			cState['fontOpacity'] = cTextSym.color.a;
			cState['fontSize'] = cTextSym.font.size;
			cState['textSymPreviewText'] = cTextSym.text;
			cState['fontHaloEnabled'] = cTextSym.haloSize !== null;
			if(cTextSym.haloColor){
			  cState['fontHaloOpacity'] = cTextSym.haloColor.a;
			  cState['fontHaloColor'] = this.convertSymbolColorToColorPickerValue(cTextSym.haloColor);
			  cState['fontHaloSize'] = cTextSym.haloSize;
			  cState['fontHalo'] = cState['fontHaloSize'] + "px " + cState['fontHaloColor'];
			} else {
			  cState['fontHaloOpacity'] = 1;
			  cState['fontHalo'] = 'unset';
			  cState['fontHaloColor'] = 'rgba(255,255,255,1)';
			  cState['fontHaloSize'] = 1;
			}
			cState['fontWeight'] = cTextSym.font.weight;
			cState['fontDecoration'] = cTextSym.font.decoration;
			cState['fontStyle'] = cTextSym.font.style;
			cState['fsBoldBtnActive'] = cTextSym.font.weight !== 'normal';
			cState['fsItalicBtnActive'] = cTextSym.font.style !== 'normal';
			cState['fsUnderlineBtnActive'] = cTextSym.font.decoration !== 'none';
			cState['fontBackgroundColor'] = this.convertSymbolColorToColorPickerValue(cTextSym.backgroundColor);
			  this.setState(cState);
		  } else {
			if (gra.geometry.type === 'point') {
				this.setState({rotationMode: true})
			}
			this.setState({
			  showSymPreview: true,
			  showTextPreview: false,
			  currentSymbol: evt.graphics[0].symbol,
			  graphics: evt.graphics,
			  clearBtnTitle: this.nls('drawClearSelected')
			});
		  }
		});
	  }
	}else if(evt.state === "complete"){
	  this.setState({
		graphics: null,
		clearBtnTitle: this.nls('drawClear'),
		rotationMode: false
	  });
	}
  }

  onSymbolPopper = (evt) => {
	//workarounds for symbol selector stying issues
	if(evt){
	  if(this.state.currentSymbolType === JimuSymbolType.Polyline){
		let ddBtnCont = document.getElementsByClassName('dropdown-button-content')[0] as HTMLElement;
		ddBtnCont.style.filter = 'invert(1)';
	  }
	  let ddBtn = document.getElementsByClassName('jimu-btn jimu-dropdown-button dropdown-button')[0] as HTMLElement;
	  if(ddBtn){
		ddBtn.addEventListener('click', (evt) => {
		  setTimeout(() => {
			let ddInner = document.getElementsByClassName('dropdown-menu--inner')[0] as HTMLElement;
			if(ddInner){
			  for (let i = 0; i < ddInner.children.length; i++) {
				let btn = ddInner.children[i];
				const imgs = btn.getElementsByTagName('img');
				for (let im = 0; im < imgs.length; im++) {
				  imgs[im].style.filter = 'invert(1)';
				}
			  }
			}
		  }, 20);
		});
	  }
	  let unitSelectors = document.getElementsByClassName('style-setting--unit-selector');
	  Array.from(unitSelectors).forEach((ele:HTMLElement) =>{
		(ele.firstChild as HTMLElement).style = { padding: 0 };
	  });
	  let popper = document.getElementsByClassName('content-container')[0].parentNode.parentElement;
	  setTimeout(() => {
		popper.style.zIndex = '1004';
	  }, 5);
	  let colorPickerBlocks = document.getElementsByClassName('color-picker-block');
	  Array.from(colorPickerBlocks).forEach((ele:HTMLElement) =>{
		ele.addEventListener('click', e=>{this.onColorPickerToggle(e)});
	  });
	}
  }

  onPointSymChanged = (evt) => {
	this.setState({
	  currentSymbol: evt,
	  currentSymbolType: JimuSymbolType.Point
	}, ()=>{
	  this.sketchViewModel.pointSymbol = evt;
	  if(this.state.graphics && this.state.graphics.length > 0){
		this.state.graphics.map((gra:Graphic)=>{
		  if(gra.geometry.type === 'point'){
			gra.symbol = evt;
		  }
		});
	  }
	});
  }

  onPolygonSymbolChanged = (evt) => {
	this.setState({
	  currentSymbol: evt,
	  currentSymbolType: JimuSymbolType.Polygon
	}, ()=>{
	  this.sketchViewModel.polygonSymbol = evt;
	  if(this.state.graphics && this.state.graphics.length > 0){
		this.state.graphics.map((gra:Graphic)=>{
		  if(gra.geometry.type === 'polygon' || gra.geometry.type === 'extent'){
			gra.symbol = evt;
		  }
		});
	  }
	});
  }

  onPolylineSymbolChanged = (evt) => {
	this.setState({
	  currentSymbol: evt,
	  currentSymbolType: JimuSymbolType.Polyline
	}, ()=>{
	  this.sketchViewModel.polylineSymbol = evt;
	  if(this.state.graphics && this.state.graphics.length > 0){
		this.state.graphics.map((gra:Graphic)=>{
		  if(gra.geometry.type === 'polyline'){
			gra.symbol = evt;
		  }
		});
	  }
	});
  }

  drawClearBtnClick = () => {
	if (this.state.graphics && this.state.graphics.length) {
	  this.sketchViewModel.delete()
	  return;
	}
	this.drawLayer.removeAll()
	this.sketchViewModel.cancel();
	this.setState({confirmDelete: false})
  }

  drawUndoBtnClick = () => {
	if(this.sketchViewModel.canUndo()){
	  this.sketchViewModel.undo();
	}
	this.setState({
	  canUndo: this.sketchViewModel.canUndo(),
	  canRedo: this.sketchViewModel.canRedo()
	});
  }

  drawRedoBtnClick = () => {
	if(this.sketchViewModel.canRedo()){
	  this.sketchViewModel.redo();
	}
	this.setState({
	  canUndo: this.sketchViewModel.canUndo(),
	  canRedo: this.sketchViewModel.canRedo()
	});
  }

  TextOnChange = (evt) => {
	let value = evt.currentTarget.value;
	let ts: TextSymbol = this.state.currentTextSymbol;
	ts.text = value;
	this.setState({
	  textSymPreviewText: value,
	  currentTextSymbol: ts,
	  textHasChanged: true
	}, ()=>{this.updateSelectedTextGras()});
  }

  fontSizeOnChange = (size) => {
	let ts: TextSymbol = this.state.currentTextSymbol;
	ts.font.size = size;
	this.setState({
	  fontSize : size,
	  currentTextSymbol: ts,
	  textPreviewHeight: this.getRotatedTextHeight()
	}, ()=>{this.updateSelectedTextGras()});
  }

  fontHaloSizeChange = (evt) => {
	let ts: TextSymbol = this.state.currentTextSymbol;
	ts.haloSize = parseInt(evt);
	this.setState({
	  fontHaloSize : parseInt(evt),
	  currentTextSymbol: ts,
	  fontHalo: this.state.fontHaloEnabled ?  evt + "px " + this.state.fontHaloColor : 'unset'
	}, ()=>{this.updateSelectedTextGras()});
  }

  updateTextColor = (evt) => {
	let ts: TextSymbol = this.state.currentTextSymbol;
	ts.color = evt;
	this.setState({
	  fontColor: this.convertSymbolColorToColorPickerValue(ts.color),
	  fontOpacity: ts.color.a,
	  currentTextSymbol: ts
	}, ()=>{this.updateSelectedTextGras()});
  }

  updateFontHaloColor = (evt) => {
	let ts: TextSymbol = this.state.currentTextSymbol;
	ts.haloColor = evt;
	this.setState({
	  fontHaloColor: evt,
	  currentTextSymbol: ts,
	  fontHalo: this.state.fontHaloEnabled ?  this.state.fontHaloSize + "px " + evt : 'unset'
	}, ()=>{this.updateSelectedTextGras()});
  }

  updateBackgroundColor = (evt) => {
	  const color = new Color(evt)
	  let ts: TextSymbol = this.state.currentTextSymbol;
	  ts.backgroundColor = color;
	this.setState({
	  fontBackgroundColor: color,
	  currentTextSymbol: ts
	}, ()=>{this.updateSelectedTextGras()});
  }

  fontHaloChkChange = (evt) => {
	const target = evt.currentTarget;
	if (!target) return;
	let ts: TextSymbol = this.state.currentTextSymbol;
	if(!target.checked){
	  ts.haloColor = null;
	  ts.haloSize = null;
	}else{
	  ts.haloColor = this.state.fontHaloColor as any;
	  ts.haloSize = this.state.fontHaloSize
	}
	this.setState({
	  currentTextSymbol: ts,
	  fontHaloEnabled: target.checked,
	  fontHalo: target.checked ? this.state.fontHaloSize + "px " + this.state.fontHaloColor : 'unset'
	}, ()=>{this.updateSelectedTextGras()});
  }

  onHTextAlignChange = (evt) => {
	let ts: TextSymbol = this.state.currentTextSymbol;
	ts.horizontalAlignment = evt;

	this.setState({
	  hTextAlign: evt,
	  currentTextSymbol: ts
	}, ()=>{this.updateSelectedTextGras()});
  }

  fontRotationChange = (evt) => {
	let ts: TextSymbol = this.state.currentTextSymbol;
	ts.angle = evt;

	this.setState({
	  fontRotation: evt,
	  currentTextSymbol: ts,
	  textPreviewHeight: this.getRotatedTextHeight()
	}, ()=>{this.updateSelectedTextGras()});
  }

  onVertFontAlignChange = (evt, valign) => {
	let ts: TextSymbol = this.state.currentTextSymbol;
	ts.verticalAlignment = valign;
	this.setState({
	  vTextAlign: valign,
	  vAlignBaseBtnActive: valign==='baseline',
	  vAlignTopBtnActive: valign==='top',
	  vAlignMidBtnActive: valign==='middle',
	  vAlignBotBtnActive: valign==='bottom',
	  currentTextSymbol: ts
	}, ()=>{this.updateSelectedTextGras()});
	this.updateActiveBtnIcons();
  }

  updateActiveBtnIcons = () => {
	setTimeout(() => {
	  let activeBtns = document.querySelectorAll('.btn-group>.icon-btn');
	  Array.from(activeBtns).forEach((ele:HTMLElement) =>{
		this.setImgElemFilter(ele, ele.classList.contains('active'));
	  });
	}, 20);
  }

  setImgElemFilter = (ele:HTMLElement, isActive:boolean) => {
	let img = ele.getElementsByTagName('img')[0] as HTMLElement;
	if(!img){
	  return;
	}
	if(img.getAttribute('style') && img.getAttribute('style').indexOf("filter:") > -1 && !isActive){
	  img.style.filter = '';
	}
	if((!img.getAttribute('style') || img.style.filter == "")  && isActive){
	  img.style.filter = 'invert(1)';
	}
  }

  onHorizFontAlignChange = (evt, halign) => {
	let ts: TextSymbol = this.state.currentTextSymbol;
	ts.horizontalAlignment = halign;
	this.setState({
	  hTextAlign: halign,
	  hAlignLeftBtnActive: halign==='left',
	  hAlignCenterBtnActive: halign==='center',
	  hAlignRightBtnActive: halign==='right',
	  currentTextSymbol: ts
	}, ()=>{this.updateSelectedTextGras()});
  }

  updateSelectedTextGras = () => {
	if(this.state.graphics && this.state.graphics.length > 0){
	  this.state.graphics.map((gra:Graphic)=>{
		if(gra.geometry.type === 'point' && gra.symbol.type === 'text'){
		  gra.symbol = this.state.currentTextSymbol;
		  const uGra = gra.clone();
		  this.drawLayer.remove(gra);
		  this.drawLayer.add(uGra);
		  this.sketchViewModel.update(uGra);
		}
	  });
	}
  }

  getRotatedTextHeight = () => {
	let span, spanParent, 
	  rad = this.state.fontRotation * (Math.PI / 180);
	if(document.getElementsByClassName('text-symbol-span')[0]){
	  span = (document.getElementsByClassName('text-symbol-span')[0] as HTMLElement);
	};
	if(document.getElementsByClassName('text-symbol-item')[0]){
	  spanParent = (document.getElementsByClassName('text-symbol-item')[0] as HTMLElement);
	};
	if(span === undefined || span === null){
	  return 13;
	}
	return Math.abs(span.clientWidth * Math.sin(rad) + span.clientHeight * Math.cos(rad)) + 12;
  }

  onFontStyleChange = (evt, key) => {
	let cState = {};
	let ts: TextSymbol = this.state.currentTextSymbol;
	if(key === 'bold') {
	  if(!this.state.fsBoldBtnActive){
		ts.font.weight = 'bold';
	  }else{
		ts.font.weight = 'normal';
	  }
	  cState['fontWeight'] = ts.font.weight;
	  cState['fsBoldBtnActive'] = !this.state.fsBoldBtnActive;
	}
	if(key === 'italic') {
	  if(!this.state.fsItalicBtnActive){
		ts.font.style = 'italic';
	  }else{
		ts.font.style = 'normal';
	  }
	  cState['fontStyle'] = ts.font.style;
	  cState['fsItalicBtnActive'] = !this.state.fsItalicBtnActive;
	}
	if(key === 'underline') {
	  if(!this.state.fsUnderlineBtnActive){
		ts.font.decoration = 'underline'
	  }else{
		ts.font.decoration = 'none';
	  }
	  cState['fontDecoration'] = ts.font.decoration;
	  cState['fsUnderlineBtnActive'] = !this.state.fsUnderlineBtnActive;
	}
	cState['currentTextSymbol'] = ts;
	this.setState(cState, ()=>{this.updateSelectedTextGras()});
	this.updateActiveBtnIcons();
  }

  setDrawToolBtnState = (toolBtn: 'point' | 'polyline' | 'freepolyline' | 'extent' | 'polygon' | 'circle' | 'freepolygon' | 'text' | '') => {
	//toggle button if already active
	let cState: Partial<States> = {
	  pointBtnActive: false,
	  lineBtnActive: false,
	  flineBtnActive: false,
	  rectBtnActive: false,
	  polygonBtnActive: false,
	  fpolygonBtnActive: false,
	  circleBtnActive: false,
	  textBtnActive: false,
	  currentTool: toolBtn
	};
	switch(toolBtn){
	  case 'point':
		cState.currentSymbol = this.sketchViewModel.pointSymbol;
		cState.currentSymbolType = JimuSymbolType.Point;
		if(this.state.pointBtnActive){
			this.sketchViewModel.cancel();
		}else{
		  this.sketchViewModel.create("point");
		  cState.pointBtnActive = true;
		}
		break;
	  case 'polyline':
		cState.currentSymbol = this.sketchViewModel.polylineSymbol;
		cState.currentSymbolType = JimuSymbolType.Polyline;
		if(this.state.lineBtnActive){
			this.sketchViewModel.cancel();
		}else{
		  this.sketchViewModel.create("polyline");
		  cState.lineBtnActive = true;
		}
		break;
	  case 'freepolyline':
		cState.currentSymbol = this.sketchViewModel.polylineSymbol;
		cState.currentSymbolType = JimuSymbolType.Polyline;
		if(this.state.flineBtnActive){
			this.sketchViewModel.cancel();
		}else{
		  this.sketchViewModel.create("polyline", {mode: 'freehand'});
		  cState.flineBtnActive = true;
		}
		break;
	  case 'extent':
		cState.currentSymbol = this.sketchViewModel.polygonSymbol;
		cState.currentSymbolType = JimuSymbolType.Polygon;
		if(this.state.rectBtnActive){
			this.sketchViewModel.cancel();
		}else{
		  this.sketchViewModel.create("rectangle");
		  cState.rectBtnActive = true;
		}
		break;
	  case 'polygon':
		cState.currentSymbol = this.sketchViewModel.polygonSymbol;
		cState.currentSymbolType = JimuSymbolType.Polygon;
		if(this.state.polygonBtnActive){
			this.sketchViewModel.cancel();
		}else{
		  this.sketchViewModel.create("polygon");
		  cState.polygonBtnActive = true;
		}
		break;
	  case 'freepolygon':
		cState.currentSymbol = this.sketchViewModel.polygonSymbol;
		cState.currentSymbolType = JimuSymbolType.Polygon;
		if(this.state.fpolygonBtnActive){
			this.sketchViewModel.cancel();
		}else{
		  this.sketchViewModel.create("polygon", {mode: 'freehand'});
		  cState.fpolygonBtnActive = true;
		}
		break;
	  case 'circle':
		cState.currentSymbol = this.sketchViewModel.polygonSymbol;
		cState.currentSymbolType = JimuSymbolType.Polygon;
		if(this.state.circleBtnActive){
			this.sketchViewModel.cancel();
		}else{
		  cState.circleBtnActive = true;
		  this.sketchViewModel.create("circle");
		}
		break;
	  case 'text':
		cState.currentSymbol = this.sketchViewModel.pointSymbol;
		cState.currentSymbolType = JimuSymbolType.Point;
		if(this.state.textBtnActive){
			this.sketchViewModel.cancel();
		}else{
		  this.sketchViewModel.create("point");
		  cState.textBtnActive = true;
		}
		break;
	  default:
		this.sketchViewModel.cancel();
	}
	cState.showSymPreview = toolBtn !== 'text' && toolBtn !== null;
	cState.showTextPreview = toolBtn === 'text';
	this.setState(cState as States);
  }

	handleSwitchToDrawings = () => {
		this.setDrawToolBtnState('')
		this.setState({ activeTab: 'mydrawings' })
	}

	handleSwitchFromDrawings = () => {
		this.setDrawToolBtnState('')
		this.setState({ activeTab: 'draw' })
	}


  showTextSymbolPopper = (evt) => {
	this.updateActiveBtnIcons();
	//Workaround for InputUnit sytling issue
	setTimeout(() => {
	  let unitSelectors = document.getElementsByClassName('style-setting--unit-selector');
	  Array.from(unitSelectors).forEach((ele:HTMLElement) =>{
		(ele.firstChild as HTMLElement).style.padding = '0';
	  });
	}, 200);
	this.setState({textPreviewisOpen: !this.state.textPreviewisOpen});
  }

  updateSymbolOpacity = (value) => {
	let ts: TextSymbol = this.state.currentTextSymbol;
	ts.color.a = value;
	this.setState({
	  fontOpacity: value,
	  currentTextSymbol: ts,
	  fontColor: this.convertSymbolColorToColorPickerValue(ts.color)
	}, ()=>{this.updateSelectedTextGras()});
  }

  onOpacityInputChanged = (e) => {
	let ts: TextSymbol = this.state.currentTextSymbol;
	ts.color.a = e.distance/100;
	this.setState({
	  fontOpacity: e.distance/100,
	  currentTextSymbol: ts,
	  fontColor: this.convertSymbolColorToColorPickerValue(ts.color)
	}, ()=>{this.updateSelectedTextGras()});
  }

  updateSymbolHaloOpacity = (value) => {
	let ts: TextSymbol = this.state.currentTextSymbol;
	ts.haloColor.a = value;
	this.setState({
	  fontHaloOpacity: value,
	  currentTextSymbol: ts,
	  fontHaloColor: this.convertSymbolColorToColorPickerValue(ts.haloColor),
	  fontHalo: this.state.fontHaloEnabled ?  this.state.fontHaloSize + "px " + this.convertSymbolColorToColorPickerValue(ts.haloColor) : 'unset'
	}, ()=>{this.updateSelectedTextGras()});
  }

  onHaloOpacityInputChanged = (e) => {
	let ts: TextSymbol = this.state.currentTextSymbol;
	ts.haloColor.a = e.distance/100;
	this.setState({
	  fontHaloOpacity: e.distance/100,
	  currentTextSymbol: ts,
	  fontHaloColor: this.convertSymbolColorToColorPickerValue(ts.haloColor),
	  fontHalo: this.state.fontHaloEnabled ?  this.state.fontHaloSize + "px " + this.convertSymbolColorToColorPickerValue(ts.haloColor) : 'unset'
	}, ()=>{this.updateSelectedTextGras()});
  }

  convertSymbolColorToColorPickerValue = (color:esriColor) => {
	if(color){
	  const rgbaClr = color.toRgba();
	  return`rgba(${rgbaClr[0]},${rgbaClr[1]},${rgbaClr[2]},${rgbaClr[3]})`
	}
	return null
  }

  onColorPickerToggle = (evt) => {
	  //workaround for color picker style issue
	setTimeout(() => {
	  let colorPicker = document.querySelectorAll('.color-picker-popper>.popper-box>.sketch-standard')[0] as HTMLElement;
	  colorPicker.style.backgroundColor = 'unset';
	}, 200);
  }

	handlePointRotation = (e) => {
		const symbol = this.state.currentSymbol.clone()
		symbol.angle = e.target? e.target.value : e
		this.onPointSymChanged(symbol)
	}

	handleFontFamily = (e) => {
		const newFont = e.target.value
		const cTextSym: TextSymbol = this.state.currentTextSymbol.clone();
		cTextSym.font.family = newFont
		this.setState({ currentTextSymbol: cTextSym });
	}

	handleListMode = (e) => {
		const checked = e.target.checked
		if (checked) {
			this.drawLayer.listMode = 'show'
		} else {
			this.drawLayer.listMode = 'hide'
		}
		this.setState({ listMode : this.drawLayer.listMode })
	}

	handleTitleChange = (e) => {
		const title = e.target.value
		this.drawLayer.title = title
		this.setState({drawLayerTitle: title})
	}

	// Updated Render, use BeyondCompare to see differences BM

	renderMyDrawingsTab() { // Update BM 5/13
		return (
			<div className="my-drawings-tab-container p-3">
				{this.drawLayer && (
					<MyDrawingsPanel
						graphicsLayer={this.drawLayer}
						jimuMapView={this.state.currentJimuMapView}
						drawings={this.drawLayer.graphics.toArray()}
						allowLocalStorage={true}
						confirmOnDelete={true}
						onDrawingSelect={this.handleDrawingSelect}
						onDrawingsUpdate={this.handleDrawingsUpdate}
						showAlert={this.showAlert}
						isActiveTab={this.state.activeTab === 'mydrawings'} // fixed casing
					/>
				)}
			</div>
		);
	}

	renderDrawPanel() {
		const { config } = this.props;
		const {
			showSymPreview, showTextPreview, drawGLLengthcheck, canRedo, canUndo,
			fontColor, fontSize, fontHaloEnabled, fontHaloColor, fontHaloSize, textSymPreviewText,
			currentSymbol, undoBtnActive, redoBtnActive, clearBtnActive, clearBtnTitle, pointBtnActive,
			lineBtnActive, flineBtnActive, rectBtnActive, polygonBtnActive, fpolygonBtnActive, circleBtnActive,
			textBtnActive, fontHalo, fontWeight, fontDecoration, fontStyle, fontRotation,
			vAlignBaseBtnActive, vAlignBotBtnActive, vAlignMidBtnActive, vAlignTopBtnActive,
			textPreviewHeight, hAlignLeftBtnActive, hAlignCenterBtnActive, hAlignRightBtnActive,
			fsBoldBtnActive, fsItalicBtnActive, fsUnderlineBtnActive, currentSymbolType, textPreviewisOpen,
			fontOpacity, fontHaloOpacity, textHasChanged
		} = this.state;

		return (
			<div>
				{/* Mode Message */}
				{!pointBtnActive && !lineBtnActive && !flineBtnActive && !rectBtnActive && !polygonBtnActive && !fpolygonBtnActive && !circleBtnActive && !textBtnActive ? (
					<div>
						{this.drawLayer?.graphics.length > 0 ? (
							<div>
								<h5 className='text-center'>Edit Mode</h5>
								<h6 className='text-center'>Select a Drawing Style to enter Drawing Mode.</h6>
							</div>
						) : (
							<div>
								<h5 className='text-center'>No Drawings Yet</h5>
								<h6 className='text-center'>Select a Drawing Style to get started.</h6>
							</div>
						)}
					</div>
				) : (
					<div>
						<h5 className='text-center'>Drawing Mode</h5>
						<h6 className='text-center'>Click the Active Drawing Style Button to Exit Drawing Mode and Activate Editing Mode.</h6>
					</div>
				)}

				{/* Drawing Buttons */}
				<div className="d-flex justify-content-center">
					<div className="drawToolbarDiv d-flex flex-column">
						<div className='buttonRow'>
							<Button size='sm' type='default' color={pointBtnActive ? 'primary' : 'default'} active={pointBtnActive}
								onClick={() => this.setDrawToolBtnState('point')} title={this.nls('drawPoint')}><Icon icon={pinIcon} /></Button>
							<Button size='sm' type='default' color={lineBtnActive ? 'primary' : 'default'} active={lineBtnActive}
								onClick={() => this.setDrawToolBtnState('polyline')} title={this.nls('drawLine')}><Icon icon={lineIcon} /></Button>
							<Button size='sm' type='default' color={flineBtnActive ? 'primary' : 'default'} active={flineBtnActive}
								onClick={() => this.setDrawToolBtnState('freepolyline')} title={this.nls('drawFreeLine')}><Icon icon={curveIcon} /></Button>
							<Button size='sm' type='default' color={textBtnActive ? 'primary' : 'default'} active={textBtnActive}
								onClick={() => this.setDrawToolBtnState('text')} title={this.nls('drawText')}><Icon icon={textIcon} /></Button>
						</div>
						<div className='buttonRow'>
							<Button size='sm' type='default' color={rectBtnActive ? 'primary' : 'default'} active={rectBtnActive}
								onClick={() => this.setDrawToolBtnState('extent')} title={this.nls('drawRectangle')}><Icon icon={rectIcon} /></Button>
							<Button size='sm' type='default' color={polygonBtnActive ? 'primary' : 'default'} active={polygonBtnActive}
								onClick={() => this.setDrawToolBtnState('polygon')} title={this.nls('drawPolygon')}><Icon icon={polyIcon} /></Button>
							<Button size='sm' type='default' color={fpolygonBtnActive ? 'primary' : 'default'} active={fpolygonBtnActive}
								onClick={() => this.setDrawToolBtnState('freepolygon')} title={this.nls('drawFreePolygon')}><Icon icon={freePolyIcon} /></Button>
							<Button size='sm' type='default' color={circleBtnActive ? 'primary' : 'default'} active={circleBtnActive}
								onClick={() => this.setDrawToolBtnState('circle')} title={this.nls('drawCircle')}><Icon icon={circleIcon} /></Button>
						</div>
					</div>
				</div>

				{/* Measure Tools */}
				<Measure
					nls={this.nls}
					config={config}
					drawLayer={this.drawLayer}
					currentTextSymbol={this.state.currentTextSymbol}
					sketchViewModel={this.sketchViewModel}
					currentTool={this.state.currentTool}
					showTextPreview={this.state.showTextPreview}
					currentSymbol={this.state.currentSymbol}
				/>

				{/* Snapping Controls */}
				<SnappingControls
					jimuMapView={this.state.currentJimuMapView}
					sketchViewModel={this.sketchViewModel}
				/>

				{/* Symbol Settings */}
				{showSymPreview && this.sketchViewModel && this.renderSymbolSelectorSection()}
				{showTextPreview && this.renderTextSymbolPreviewButton()}
				{textPreviewisOpen && this.renderTextPopper()}

				{/* Toolbar Buttons */}
				<div className="drawToolbarBottomDiv">
					{(canUndo || canRedo) && (
						<div>
							<Button size='sm' type='secondary' active={undoBtnActive}
								onClick={this.drawUndoBtnClick} title={this.nls('drawUndo')} disabled={!canUndo}>
								<ArrowUndoOutlined /> Undo
							</Button>
							<Button size='sm' type='secondary' active={redoBtnActive}
								onClick={this.drawRedoBtnClick} title={this.nls('drawRedo')} disabled={!canRedo}>
								<ArrowRedoOutlined /> Redo
							</Button>
						</div>
					)}
					{this.state.clearBtnTitle === this.nls('drawClear') ?
						this.state.confirmDelete ?
							<div className='d-flex'>
								<Button size='sm' type='danger' active={clearBtnActive}
									onClick={this.drawClearBtnClick} title={clearBtnTitle}>
									<TrashOutlined /> {clearBtnTitle}
								</Button>
								<Button size='sm' type='secondary' active={clearBtnActive}
									onClick={() => this.setState({ confirmDelete: false })} title='Cancel'>
									<WrongOutlined /> Cancel
								</Button>
							</div>
							:<Button size='sm' type='secondary' active={clearBtnActive}
								onClick={() => this.setState({confirmDelete: true})} title={clearBtnTitle} disabled={!drawGLLengthcheck}>
								<TrashOutlined /> {clearBtnTitle}
							</Button>
						:<Button size='sm' type='danger' active={clearBtnActive}
							onClick={this.drawClearBtnClick} title={clearBtnTitle}>
							<TrashOutlined /> {clearBtnTitle}
						</Button>
					}
				</div>
				{this.props.config.changeListMode || this.props.config.changeTitle ?
					<div className='drawToolbarDiv'>
						<CollapsablePanel
							label='Draw Layer Settings'
						>
							<div>
								<Label className='w-100'>
									Draw Layer Title:
									<TextInput
										defaultValue={this.props.config.title}
										onChange={(e) => this.handleTitleChange(e)}
										type='text'
										allowClear
										required
							
									/>
								</Label>
								<Label
									centric
								>
									<Checkbox
										checked={this.state.listMode === 'show'}
										onClick={(e) => this.handleListMode(e)}
										className='mr-2 mt-2 mb-2 ml-4'
									/>
									Show In Map Layer List
								</Label>
							</div>
						</CollapsablePanel>
					</div>
					: <div></div>
				}
			</div>
		);
	}


	render() {
		const { config } = this.props;
		const {
			fontColor, fontSize, fontHalo, fontRotation, fontWeight, fontStyle, fontDecoration,
			fontHaloColor, fontHaloEnabled, fontHaloSize, textSymPreviewText, textPreviewHeight,
			currentSymbol, currentSymbolType, fontOpacity, fontHaloOpacity, textHasChanged,
			undoBtnActive, redoBtnActive, clearBtnActive, clearBtnTitle, canUndo, canRedo,
			showSymPreview, showTextPreview, textPreviewisOpen, drawGLLengthcheck, rotationMode,
			pointBtnActive, lineBtnActive, flineBtnActive, rectBtnActive, polygonBtnActive,
			fpolygonBtnActive, circleBtnActive, textBtnActive, vAlignBaseBtnActive, vAlignTopBtnActive,
			vAlignMidBtnActive, vAlignBotBtnActive, hAlignLeftBtnActive, hAlignCenterBtnActive,
			hAlignRightBtnActive, fsBoldBtnActive, fsItalicBtnActive, fsUnderlineBtnActive,
			activeTab
		} = this.state;

		return (
			<div className="widget-draw jimu-widget" css={getStyle(this.props.theme, config)}>
				{/* Attach to Map View */}
				{this.props.useMapWidgetIds && this.props.useMapWidgetIds.length === 1 && (
					<JimuMapViewComponent
						useMapWidgetId={this.props.useMapWidgetIds[0]}
						onActiveViewChange={this.activeViewChangeHandler}
					/>
				)}

				{/* Tab Layout */}
				<div className="tab-header mb-2">
					<div
						className={`tab-button ${activeTab === 'draw' ? 'active' : ''}`}
						onClick={this.handleSwitchFromDrawings}
					>
						Draw
					</div>
					<div
						className={`tab-button ${activeTab === 'mydrawings' ? 'active' : ''}`}
						onClick={this.handleSwitchToDrawings}
					>
						My Drawings
					</div>
				</div>

				{/* Tab Content */}
				<div className="tab-content">
					{activeTab === 'draw' && this.renderDrawPanel()}
					{activeTab === 'mydrawings' && this.renderMyDrawingsTab()}
				</div>
			</div>
		);
	}


}
