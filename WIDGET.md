i want to write some code around the concept of the appliance class.

I think everything that is interactable can stem from different expressions of a utility "widget" that we can call the appliance. Here are some of its properties and how it can tie into existing mechanics.

fundamentally, the widget is an interactable object much like the bar, the wine, the glass, the table, and the service. It is the base from which all of these things are extended.

Every widget will have:

- a "top slot count". this is the part the user can immediately see. items can be placed in the top slot. On the bar, the top slot is 1, on service, the top slot is 8. This slot system if single, is accessed by the pick/place key. Otherwise will bring up the picker modal
- a "storage slot". this is stored lower in the appliance conceptually. This is expressed as the wines four options, the drafts four options. It will have further uses in the future design. For example, under bar appliances can have a bar top and storage slots for ice, or storage slots for rail liquor. this will be accessed by the use key.
- seat slots. These are present on all edges. so a 1x1 appliance will have 4 seat slots (that can be turned off and on). a 1x2 would have 6, and a 2x2 would have 8 slots, and so on. tables would have four, maybe high tops have up to two, and bars only have one. Customers connect into seat slots. Any appliance that get a seat slot is a place a customer can sit and drink. any appliance that has a seat with a customer on it, when looked at, brings up the customer card.
- appliances can be place or pick up only.
- the queue may be another attachment. the queue can be placed instead of a seat and have a queue forming direction associated with it.

## Application examples

- wine could be rethought of as a container you take out of the current wine appliance, and you get a wine bottle. The wine bottle could then be placed on a top slot of a "counter" appliance that has four top lots. So that way you can introduce a mechanic of pulling out wine bottles and putting them on the counter to be later accessed by glasses to pour them until they are empty and need to be replaced from the wine appliance.
- wine appliance. four top slots with wine bottles that can be picked up via modal.
- glass appliance. one top slot, no modal
- bar. 4 storage slots like wine, a south seat, one top slot.
- table. no storage slots, one top slot, four seat slots.
- trash bin, four top slots, place only, or trash storage slot, pick up only.

## Next steps

- make a class that is the base appliance that can be extended and configured into all other appliances
- find "gotchas". things that are ambigous or dont fit the model. or would need to be "forced" to work.

## the future

- build this with plans to add a dev tool that builds these appliances for experimentations and prototyping, and is this library of appliances are persistent between runs.
