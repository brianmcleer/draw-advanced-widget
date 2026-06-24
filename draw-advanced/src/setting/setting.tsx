
import {React, defaultMessages as jimuCoreMessages,} from 'jimu-core';
import {AllWidgetSettingProps} from 'jimu-for-builder';
import {IMConfig, DrawMode} from '../config';
import defaultMessages from './translations/default';
import {MapWidgetSelector, SettingSection, SettingRow} from 'jimu-ui/advanced/setting-components';
import { Select, Option, defaultMessages as jimuUIDefaultMessages, Checkbox, TextInput, Label, Button, Alert } from 'jimu-ui'
import { SidePopper } from 'jimu-ui/advanced/setting-components'
import UnitMaker from './components/unitMaker';

const defaultDistanceUnits = [
    { unit: 'kilometers', label: 'Kilometers', abbreviation: 'km', conversion: 0.001 },
    { unit: 'miles', label: 'Miles', abbreviation: 'mi', conversion: 0.000621371 },
    { unit: 'meters', label: 'Meters', abbreviation: 'm', conversion: 1 },
    { unit: 'nautical-miles', label: 'Nautical Miles', abbreviation: 'NM', conversion: 0.000539957 },
    { unit: 'feet', label: 'Feet', abbreviation: 'ft', conversion: 3.28084 },
    { unit: 'yards', label: 'Yards', abbreviation: 'yd', conversion: 1.09361 }
];

const defaultAreaUnits = [
    { unit: 'square-kilometers', label: 'Square Kilometers', abbreviation: 'km²', conversion: 0.000001 },
    { unit: 'square-miles', label: 'Square Miles', abbreviation: 'mi²', conversion: 3.86102e-7 },
    { unit: 'acres', label: 'Acres', abbreviation: 'ac', conversion: 0.000247105 },
    { unit: 'hectares', label: 'Hectares', abbreviation: 'ha', conversion: 0.0001 },
    { unit: 'square-meters', label: 'Square Meters', abbreviation: 'm²', conversion: 1 },
    { unit: 'square-feet', label: 'Square Feet', abbreviation: 'ft²', conversion: 10.7639 },
    { unit: 'square-yards', label: 'Square Yards', abbreviation: 'yd²', conversion: 1.19599 }
];


export default class Setting extends React.PureComponent<AllWidgetSettingProps<IMConfig>, any>{    
    constructor(props) {
        super(props)

        this.state = {
            linearSidePopper: false,
            areaSidePopper: false,
            defaultDistanceUnit: this.props.config.defaultDistance,
            defaultAreaUnit: this.props.config.defaultArea,
            availableDistanceUnits: [...defaultDistanceUnits, ...this.props.config.userDistances],
            availableAreaUnits: [...defaultAreaUnits, ...this.props.config.userAreas]
        }
    }

  onPropertyChange = (name, value) => {
    const { config } = this.props
    if (value === config[name]) {
      return
    }
    const newConfig = config.set(name, value)
    const alterProps = {
      id: this.props.id,
      config: newConfig
    }
    this.props.onSettingChange(alterProps)
  }

  onMapWidgetSelected = (useMapWidgetsId: string[]) => {
    this.props.onSettingChange({
      id: this.props.id,
      useMapWidgetIds: useMapWidgetsId
    });
  }

  handleDrawModeChange = (evt) => {
    const value = evt?.target?.value
    this.onPropertyChange('creationMode', value)
  }

  handleTurnOff = () => {
      this.props.onSettingChange({
          id: this.props.id,
          config: this.props.config.set('turnOffOnClose', !this.props.config.turnOffOnClose)
      })
    }

  handleChangeTitle = () => {
      this.props.onSettingChange({
          id: this.props.id,
          config: this.props.config.set('changeTitle', !this.props.config.changeTitle)
      })
    }

    handleChangeListMode = () => {
      this.props.onSettingChange({
          id: this.props.id,
          config: this.props.config.set('changeListMode', !this.props.config.changeListMode)
      })
    }

    handleListMode = () => {
      this.props.onSettingChange({
          id: this.props.id,
          config: this.props.config.set('listMode', !this.props.config.listMode)
      })
    }

  handleTitle = (value) => {
      this.props.onSettingChange({
          id: this.props.id,
          config: this.props.config.set('title', value)
      })
  }

  handleDefaultDistance = (value) => {
      this.props.onSettingChange({
          id: this.props.id,
          config: this.props.config.set('defaultDistance', value)
      })
      this.setState({ defaultDistanceUnit : value })
  }

  handleDefaultArea = (value) => {
      this.props.onSettingChange({
          id: this.props.id,
          config: this.props.config.set('defaultArea', value)
      })
      this.setState({defaultAreaUnit: value})
  }

    handleAddUnit = (newUnit, type) => {
        if (type === 'linear') {
            const userDistances = this.props.config.userDistances || []
            userDistances.push(newUnit)
            this.props.onSettingChange({
                id: this.props.id,
                config: this.props.config.set('userDistances', userDistances)
            })
            this.setState({ availableDistanceUnits: [...defaultDistanceUnits, ...userDistances], defaultDistanceUnit: null })
        } else {
            const userAreas = this.props.config.userAreas || []
            userAreas.push(newUnit)
            this.props.onSettingChange({
                id: this.props.id,
                config: this.props.config.set('userAreas', userAreas)
            })
            this.setState({ availableAreaUnits: [...defaultAreaUnits, ...userAreas], defaultAreaUnit: null })
        }
    }

    handleChangeUnit = (newUnit, type) => {
        if (type === 'linear') {
            const userDistances = structuredClone(this.props.config.userDistances)
            const index = userDistances.findIndex(existing => existing.unit === newUnit.unit)
            userDistances[index] = newUnit
            this.props.onSettingChange({
                id: this.props.id,
                config: this.props.config.set('userDistances', userDistances)
            })
            this.setState({ availableDistanceUnits: [...defaultDistanceUnits, ...userDistances], defaultDistanceUnit: null })
        } else {
            const userAreas = structuredClone(this.props.config.userAreas)
            const index = userAreas.findIndex(existing => existing.unit === newUnit.unit)
            userAreas[index] = newUnit
            this.props.onSettingChange({
                id: this.props.id,
                config: this.props.config.set('userAreas', userAreas)
            })
            this.setState({ availableAreaUnits: [...defaultAreaUnits, ...userAreas], defaultAreaUnit: null })
        }
    }

    handleDeleteUnit = (name, type) => {
        if (type === 'linear') {
            let userDistances = this.props.config.userDistances
            userDistances = userDistances.filter(existing => existing.unit !== name)
            this.props.onSettingChange({
                id: this.props.id,
                config: this.props.config.set('userDistances', userDistances)
            })
            this.setState({ availableDistanceUnits: [...defaultDistanceUnits, ...userDistances], defaultDistanceUnit: null })
        } else {
            let userAreas = this.props.config.userAreas
            userAreas = userAreas.filter(existing => existing.unit !== name)
            this.props.onSettingChange({
                id: this.props.id,
                config: this.props.config.set('userAreas', userAreas)
            })
            this.setState({ availableAreaUnits: [...defaultAreaUnits, ...userAreas], defaultAreaUnit: null })
        }
    }

  formatMessage = (id: string, values?: { [key: string]: any }) => {
    const messages = Object.assign({}, defaultMessages, jimuUIDefaultMessages, jimuCoreMessages)
    return this.props.intl.formatMessage({ id: id, defaultMessage: messages[id] }, values)
  }

  render() {
    const { useMapWidgetIds, config } = this.props
    return (
    <div>
      <div className="widget-setting-psearch">
        <SettingSection className="map-selector-section" title={this.props.intl.formatMessage({id: 'sourceLabel', defaultMessage: defaultMessages.sourceLabel})}>
          <SettingRow label={this.formatMessage('selectMapWidget')}></SettingRow>
          <SettingRow>
            <MapWidgetSelector onSelect={this.onMapWidgetSelected} useMapWidgetIds={useMapWidgetIds} />
          </SettingRow>
          <SettingRow label={this.formatMessage('selectDrawMode')} flow='wrap'>
            <Select value={config.creationMode} onChange={this.handleDrawModeChange} className='drop-height'>
              <option value={DrawMode.CONTINUOUS}>{this.formatMessage('drawModeContinuous')}</option>
              <option value={DrawMode.SINGLE}>{this.formatMessage('drawModeSingle')}</option>
            </Select>
          </SettingRow>
          
          <SettingRow label='Draw Layer Settings' flow='wrap'>
             <Label
               className='w-100 mt-2 mb-2'
             >
               Draw Layer Name:
               <TextInput
                   type='text'
                   required
                   defaultValue='Drawn Graphics'
                   onChange={(e) => this.handleTitle(e.target.value)}
               />
             </Label>
             <div>
                <Checkbox checked={this.props.config.changeTitle} onChange={this.handleChangeTitle} />
                <span>Allow Users To Change Draw Layer Name</span>
             </div>
             <div>
                <Checkbox checked={this.props.config.listMode} onChange={this.handleListMode} />
                <span>Show In Map Layer List</span>
             </div>
             <div>
                <Checkbox checked={this.props.config.changeListMode} onChange={this.handleChangeListMode} />
                <span>Allow Users To Show/Hide In Map Layer List</span>
             </div>
          </SettingRow>
          <SettingRow label='Measurement Settings' flow='wrap'>
                <Button
                    onClick={() => this.setState({ linearSidePopper: true })}
                >
                    Add or Change Linear Units
                </Button>
            <Label
                className='w-100 mt-2 mb-2'
            >
                Default Linear Unit:
                <Select
                    title='Linear Units'
                    onChange={(e) => this.handleDefaultDistance(e.target.value)}
                    value={this.state.defaultDistanceUnit}
                >
                    {this.state.availableDistanceUnits.map((unit, index) => {
                        return (
                            <Option
                                value={index}
                            >
                                {unit.label + " (" + unit.abbreviation + ")"}
                            </Option>
                        )
                    })}
                </Select>
                {this.state.defaultDistanceUnit !== null ? <></> : <Alert>Reset Default Distance Units</Alert>}
            </Label>
                <Button
                     onClick={() => { this.setState({ areaSidePopper: true }) }}
                >
                     Add or Change Area Units
                </Button>
            <Label
                className='w-100 mt-2 mb-2'
            >
                Default Area Units:
                <Select
                    title='Area Units'
                    onChange={(e) => { this.handleDefaultArea(e.target.value) }}
                    value={this.state.defaultAreaUnit}
                >
                    {this.state.availableAreaUnits.map((unit, index) => {
                        return (
                            <Option
                                value={index}
                            >
                                {unit.label + " (" + unit.abbreviation + ")"}
                            </Option>
                        )
                    })}
                </Select>
                Note: superscript numbers may not display correctly in this menu, but will work in application.
                {this.state.defaultAreaUnit !== null ? <></> : <Alert>Reset Default Area Units</Alert>}
            </Label>
          </SettingRow>
          <SettingRow label='Stop Drawing On Close' flow='wrap'>
             <div>
                <Checkbox checked={this.props.config.turnOffOnClose} onChange={this.handleTurnOff} />
                <span>This widget is in a Widget Controller and I want to stop drawing when I close it.</span>
             </div>
          </SettingRow>
        </SettingSection>
      </div>
      <SidePopper
                position='right'
                isOpen={this.state.linearSidePopper}
                toggle={() => { this.setState({ linearSidePopper: !this.state.linearSidePopper }) }}
                title='Change Linear Units'
            >
                <Alert>The Default Linear Unit must be reset after changes in this panel.</Alert>
                <UnitMaker allUnits={this.state.availableDistanceUnits} handleAddUnit={this.handleAddUnit} type={'linear'}></UnitMaker>
                {this.props.config.userDistances && this.props.config.userDistances?.length > 0 ?
                    <div>
                        <hr />
                        <h3>Edit Units</h3>
                    </div>
                    :<></>
                }
                {this.props.config.userDistances && this.props.config.userDistances.map((oldUnit) => {
                    return <UnitMaker allUnits={this.state.availableDistanceUnits} handleChangeUnit={this.handleChangeUnit} type={'linear'} oldUnit={oldUnit} handleDeleteUnit={this.handleDeleteUnit}></UnitMaker>
                }) }
      </SidePopper>
      <SidePopper
                position='right'
                isOpen={this.state.areaSidePopper}
                toggle={() => { this.setState({ areaSidePopper: !this.state.areaSidePopper }) }}
                title='Change Area Units'
            >
                <Alert>The Default Area Unit must be reset after changes in this panel.</Alert>
                <UnitMaker allUnits={this.state.availableAreaUnits} handleAddUnit={this.handleAddUnit} type={'area'}></UnitMaker>
                {this.props.config.userAreas && this.props.config.userAreas?.length > 0 ?
                    <div>
                        <hr />
                        <h3>Edit Units</h3>
                    </div>
                    : <></>
                }
                {this.props.config.userAreas && this.props.config.userAreas.map((oldUnit) => {
                    return <UnitMaker allUnits={this.state.availableAreaUnits} handleChangeUnit={this.handleChangeUnit} type={'area'} oldUnit={oldUnit} handleDeleteUnit={this.handleDeleteUnit}></UnitMaker>
                })}
      </SidePopper>
    </div>
    )
  }
}