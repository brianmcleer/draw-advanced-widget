import { React } from 'jimu-core'
import { TextInput, NumericInput, Label, Button, CollapsablePanel } from 'jimu-ui'
import defaultMessages from '../translations/default'

const { useState, useEffect } = React

const UnitMaker = (props) => {
    // Translation helper passed down from the settings panel; English defaults when absent.
    const nls = (id: string, values?: Record<string, any>): string => props.nls
        ? props.nls(id, values)
        : String((defaultMessages as any)[id] ?? id).replace(/\{(\w+)\}/g, (m, k) => (values && values[k] != null ? String(values[k]) : m))
    const allUnits = props.allUnits
    const type = props.type
    const oldUnit = props.oldUnit

    const [unit, setUnit] = useState(oldUnit?.unit || '')
    const [label, setLabel] = useState(oldUnit?.label || '')
    const [abbreviation, setAbbreviation] = useState(oldUnit?.abbreviation || '')
    const [conversion, setConversion] = useState(oldUnit?.conversion || 1)
    const [allValid, setAllValid] = useState(false)
    const [validityText, setValidityText] = useState('')

    //checks unit for validity
    useEffect(() => {
        let valid = true
        let text = ''
        const letters = /^[a-zA-Z]+$/.test(unit)
        if (unit === '' || label === '' || abbreviation === '') {
            valid = false
            text = nls('settingRequiredFieldMissing')
        }
        if (!conversion) {
            valid = false
            text = nls('settingInvalidConversionFactor')
        }
        if (!letters) {
            valid = false
            text = nls('settingNameMayOnlyContainLetters')
        }
        for (let i = 0; i < allUnits.length; i++) {
            if (unit === allUnits[i].unit) {
                if (oldUnit && oldUnit.unit === unit) {
                    //intentionally blank
                    continue
                } else {
                    valid = false
                    text = nls('settingNameMustBeUnique')
                }
            }
        }
        setAllValid(valid)
        setValidityText(text)
    }, [unit, label, abbreviation, conversion])

    return <CollapsablePanel
        defaultIsOpen={!oldUnit}
        label={oldUnit ? nls('settingEditDeleteLabel', { label }) : nls('settingCreateNewUnit')}
        type={oldUnit ? 'primary' : 'default'}
        className='mb-2'
    >
        <Label
            className='w-100'
        >
            {props.handleChangeUnit ? nls('settingNameCannotBeChanged') : nls('settingNameMustBeUniqueLettersOnly')}
            <TextInput
                allowClear={!props.handleChangeUnit}
                required
                type='text'
                onChange={(e) => setUnit(e.target.value)}
                defaultValue={unit}
                readOnly={props.handleChangeUnit}
            />
        </Label>
        <Label
            className='w-100'
        >
            {nls('settingLabelFullNameUsedInMenus')}
            <TextInput
                allowClear
                required
                type='text'
                onChange={(e) => setLabel(e.target.value)}
                defaultValue={label}
            />
        </Label>
        <Label
            className='w-100'
        >
            {nls('settingAbbreviationUsedOnMap')}
            <TextInput
                allowClear
                required
                type='text'
                onChange={(e) => setAbbreviation(e.target.value)}
                defaultValue={abbreviation}
            />
        </Label>
        <Label
            className='w-100'
        >
            {type === 'linear' ? nls('settingConversionFactorOneMeterIsHow') : nls('settingConversionFactorOneSquareMeterIs')}
            <NumericInput
                className='w-100'
                required
                defaultValue={conversion}
                onChange={(e) => setConversion(e)}
            />
        </Label>
        {allValid ?
            <div>
                <h6>{type === 'linear' ? nls('setting1MeterConversionLabelAbbreviation', { conversion, label, abbreviation }) : nls('setting1SquareMeterConversionLabelAbbreviation', { conversion, label, abbreviation })}</h6>
                <Button
                    block
                    onClick={() => props.handleAddUnit ? props.handleAddUnit({ unit, label, abbreviation, conversion }, type) : props.handleChangeUnit({ unit, label, abbreviation, conversion }, type)}
                >
                    {nls('settingSaveUnit')}
                </Button>
            </div>
            : <h6>{validityText}</h6>}
        {props.handleDeleteUnit ? 
            <Button
                block
                type='danger'
                onClick={() => props.handleDeleteUnit(unit, type)}
            >
                {nls('settingDeleteUnit')}
            </Button>
            : <></>
        }
    </CollapsablePanel>
}

export default UnitMaker