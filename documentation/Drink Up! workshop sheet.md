# Pitch

Along the lines of Overcooked and PlateUp\!, and other hands-off, arcade style restaurant sims with some measure of hands-on customization of each run, the core concept of this game is to explore that sort of mechanic as it applies to bars and drinkers, rather than just food and diners. The simplicity of these games is the appeal, but there is always some element missing due to the way restaurants are perceived by guests and operated on that perception by the owners; bars live and die by this perception in the real world quite a bit more heavily than restaurants, and allowing a deeper level of customization along those lines is the intent. The player should be able to throw their entire focus into their bar, picture it as an entity, really feel the presence of it as they play the game–and then move onto the next concept they’ve been meaning to check out and do it all over again. Building up the workspace based on certain physical limitations is, like the aforementioned games, the main mechanic; however, sort of like in PlateUp\!, the options for Charming, Formal, or Exclusive are much more deeply explored, and the personalities of the bar can be mixed and matched to create a certain expectation of service that either jive or clash with the personalities of the guests. Ultimately, the main goal is to make enough money to keep service going; in order to do that, the player has to run a cost efficient service that can build a reputation of keeping guests happy. Beyond that, the sky is the limit on what kind of establishment they can operate.

# Bar space

* ### Starting setup

  * X starting money \+Y per extra player  
  * YxZ floorspace  
  * N counters  
  * Service bar  
  * Sink  
  * Ice well  
  * Liquor rail  
  * Bin  
  * Bathroom door

* ### Floorspace

  * Tiled isometric plane  
  * One guest per tile  
  * Players & other guests can clip through guests in occupied tile  
    * Slower than normal walking speed  
    * Slightly lowers happiness of guest

* ### Zoning

* #### Named section

  * No effect other than visual marker

* #### Standing room

  * Acts as guest seating  
    * All happiness increases slower

* #### Dancefloor

  * Chance for guests to occupy during Drinking status

* #### Walking lane

  * Guests will not enter unless moving somewhere

* #### Employees only

  * Guests will not enter

# Shift phases

* ### Service Phase

  * 2.5 minutes  
  * Guests procedurally generate and walk along sidewalk  
    * Random sized parties ranging 1-8 guests  
    * Random chance of entering determined by  
      * Reputation score  
      * Guest traits  
      * Bar vibe  
      * Time of day  
      * Guest happiness from previous visits  
  * Party enters, self seats if host wage budget is set to 0  
    * If no seating for whole party, Waiting at door status  
  * Guest is in Deciding status before Ready to order status  
  * Players interact with guests to reveal order, guest is now in Waiting for order status  
  * Serving drink to guest increases happiness, guest is now in Drinking status  
  * Chatting status randomly occurs during Drinking status  
  * Empty is produced after Drinking status, guest is back to Deciding status  
    * Guests will order random number of rounds before deciding to leave  
    * Empty is unusable until cleaned  
    * Drinking status carries chance to create mess  
  * Player can refuse service to any guest for small happiness penalty  
    * Happiness penalty mitigated by high drunkenness

* ### Closing Phase

  * 1 minute  
  * All guests preferring another round now in Ready to order status  
  * No new guests arrive  
  * Players use this time to clean while finishing serving & interacting with guests  
    * Any messes left at end of closing phase will become larger during next prep phase

* ### Prep Phase

  * 2.5 minutes  
    * Toggle to immediately start service  
  * No guests arrive  
  * Adjust budget, menu, prices  
  * Examine shift recaps, bar stats & regular guests  
  * Rebrand new vibe  
  * Buy & reposition appliances  
  * Expand/rezone floorspace  
  * Buy stock

* ### Temporarily Closed

  * Toggle during prep phase to turn upcoming service & closing phases into more prep phase  
  * Some budget costs are still charged

# Quantities

* #### Money

  * Paid out on serving order to guest  
    * Amount determined by menu prices  
    * Used for buying things, budgeting things, rebranding, expanding

  * #### Reputation

    * Paid out upon leaving  
      * Payout scales with happiness  
        * Positive for high, negative for low  
    * Increases guest count

  * #### Happiness

    * Raises or lowers depending on service, guest interactions & amenities

  * #### Drunkenness

    * Raises during Drinking status at set rate  
    * High drunkenness creates messes

  * #### Police attention

    * Raises with after hours vibe, overserves, serving underage guests  
    * Decreases with police bribes in budget

# Costs

* ### Purchasables

  * #### Annex

    * Cost increases with each purchase

  * #### Backup generator

    * Annexed floorspace requires new purchase

  * #### Stocking

    * Menu items

  * #### Appliances/amenities

    * Can be resold at loss

  * #### Rebrand

    * Cost increases with each purchase

  * #### Cocktail training

    * Shorter action process for tin  
    * Cost increases with each purchase (5 max)

  * #### Sommelier training

    * Increased happiness when serving wine  
    * Cost increases with each purchase (3 max)

  * #### Cicerone training

    * Increased happiness when serving beer  
    * Cost increases with each purchase (3 max)

* ### Budget items

  * #### Bouncer wage

    * Can be set for specific window of time  
    * Set cost per 30 seconds

  * #### Host wage

    * Can be set for specific window of time  
    * Cost slider paid out per 30 seconds  
    * Higher budget creates faster moving/more hosts

  * #### Barback wage

    * Can be set for specific window of time  
    * Cost slider paid out per 30 seconds  
    * Higher budget creates faster moving/more barbacks

  * #### Kitchen staff wage

    * Unlocked with kitchen window appliance  
    * Can be set for specific window of time  
    * Cost slider paid out per 30 seconds  
    * Higher budget produces plates faster & increases guest happiness more

  * #### Restroom fixtures

    * Cost slider  
    * Higher budget reduces chance of going out of service

  * #### Police bribes

    * Cost slider  
    * Higher budget reduces chance of police sting

  * #### Maintenance

    * Small daily cost per tile of floorspace  
    * Larger daily costs per appliance

  * #### Brewing

    * Unlocked with microbrewery vibe  
    * Cost slider

  * #### Distilling

    * Unlocked with distillery vibe  
    * Cost slider

# Appliances

* ### Bar counter ($)

  * 1 open slot  
    * Seats 1 guest  
    * Size: 1x1

  * ### Bar passthrough ($)

    * 1 open slot  
    * Seats 0 guests  
    * Size 1x1  
    * Toggle to create open floor tile  
      * Cannot be toggled when open slot is occupied

  * ### Service bar ($)

    * 8 open slots  
    * Seats 0 guests  
    * Size: 2x1

  * ### Ice well ($)

    * Stocks infinite ice  
    * Size: 1x1  
      * Can be combined with bar counter

  * ### Ice box ($)

    * Stocks 8 of any  
      * Beers  
      * Chilled wines  
      * Ingredients  
    * Size: 1x1  
      * Can be combined with bar counter

  * ### Lowboy fridge ($$)

    * 2 open slots  
    * Stocks 12 of any  
      * Beers  
      * Chilled wines  
      * Ingredients  
    * Size: 2x1

  * ### Draft system ($$$)

    * Stocks 8 beers or wines  
    * Cheaper to stock than lowboy fridge/wine rack  
    * Size: 2x1

  * ### Wine rack ($)

    * Stocks 5 non chilled wines  
    * Size: 1x1

  * ### Tin stack ($)

    * Stocks 8 tins  
    * Size: 1x1

  * ### Glass shelf ($)

    * Stocks 40 glasses  
    * Size: 3x1

  * ### Liquor rail ($)

    * Stocks 8 spirits  
    * Size: 1x1

  * ### Liquor shelf ($$)

    * Stocks 15 spirits  
    * Size: 3x1

  * ### Blender ($)

    * Stocks 1 blender cup  
    * Automatic process turns ice, spirits, & ingredients into 1 drink  
    * Size: 1x1

  * ### Slushy ($$$)

    * Automatic process turns spirits & ingredients into 20 drinks  
    * Size: 1x1

  * ### Hightop ($)

    * Seats 4 guests  
    * Can be moved during service & closing  
    * Size: 1x1

  * ### Table ($)

    * Seats 4 guests  
    * Can be moved during service & closing  
    * Size: 1x1

  * ### Coffee table ($)

    * 10 open slots  
    * Place drink to serve adjacent lounge chairs or sofas  
    * Can be moved during service & closing  
    * Size: 2x1

  * ### Lounge chair ($$)

    * Seats 1 guest  
    * Guest will automatically place empty on nearest open slot if no nearby coffee table  
    * Can be moved during service & closing  
    * Size: 1x1

  * ### Sofa ($$$)

    * Seats 3 guests  
    * Guests will automatically place empties on nearest empty slot if no nearby coffee table  
    * Size: 3x1

  * ### Humidor ($$)

    * Stocks 100 cigars  
    * Size: 1x0

  * ### Water closet ($$$)

    * At least 1 required  
    * Chance to go out of service  
    * Size: 1x0

  * ### Kitchen window ($$$$)

    * Fits 6 plates  
    * Automatic process produces plates after taking guest order  
    * Speed determined by budget  
    * Size: 2x0

  * ### Tray stand ($)

    * Stocks 1 tray  
    * Size: 1x1

  * ### Beer canner ($)

    * Stocks infinite beer cans  
    * Manual process turns can & beer into 1 takeout beer  
    * Size: 1x1

  * ### Bin ($)

    * Fits 20 empty bottles/large messes  
    * Size: 1x1

  * ### Sink ($)

    * Manual process cleans up to 2 glasses, tins, or blender cups  
    * Size: 1x1  
      * Can be combined with bar counter

  * ### Glasswasher ($$$)

    * Automatic process cleans up to 20 glasses, tins, or blender cups  
    * Takes longer than sink  
    * Size: 1x1  
      * Can be combined with bar counter

  * ### Mop bucket ($)

    * Stocks 2 mops  
    * Size: 1x1

  # Amenities

	Buffs guest happiness

* ### Passives

  Buffs scale with budget

  * #### TV ($-$$$)

    * Small AOE buff  
      * Sizes (scales with budget)  
        * 1x0  
        * 2x0  
        * 3x0

    * #### Quizmaster ($-$$)

      * Buffs up to 20 random guests during set time window  
        * Double for miserable guests  
      * Buffed guests do not leave during set time window  
      * Size: 2x2

    * #### Wall art ($-$$$$)

      * Small AOE buff  
        * Double for pretentious, eccentric, artsy, & highroller guests  
      * Sizes (randomized–does not scale with budget)  
        * 1x0  
        * 2x0  
        * 3x0  
        * 4x0  
        * 5x0  
      * Visuals change based on vibe

    * #### Go-go dancer ($$-$$$$)

      * Large AOE buff  
        * Double for flirty, underage, eccentric, & miserable guests  
      * Size: 1x1

    * #### Art installation ($$-$$$$$)

      * Large AOE buff  
        * Double for pretentious, eccentric, artsy, & highroller guests  
      * Sizes (scales with budget)  
        * 1x1  
        * 2x2  
        * 3x3  
        * 4x4  
      * Visuals change based on vibe

  * ### Music

    One per room

    * #### Jukebox ($)

      * On interact: randomly distributed buffs & debuffs  
        * Does not affect miserable guests  
      * Small money payout  
      * Size: 1x1

    * #### Karaoke ($$)

      * Fits 2 guests  
      * On interact: buffs all guests according to drunkenness, miserable guests immediately leave  
      * Size: 2x2

    * #### Jazz band ($$)

      * Buffs all guests during set time window  
        * Double for pretentious, eccentric, artsy, elderly, miserable, or highroller guests  
        * Does not affect violent or underage guests  
      * Size: 4x4

    * #### Rock band ($$)

      * Buffs all guests during set time window  
        * Double for violent or underage guests  
        * Half for elderly guests  
        * Miserable guests leave during window  
      * Requires adjacent zoned dancefloor  
      * Size: 4x4

    * #### DJ booth ($$$)

      * Buffs all guests  
        * Does not affect miserable guests  
      * Requires adjacent zoned dancefloor  
      * Size: 3x2

  * ### Interactives

    * #### Dartboard ($)

      * Fits 4 guests  
      * On interact: small buff, chance for bar fight with nearby guests  
      * Size: 1x4

    * #### Table tennis ($)

      * Requires 2 or 4 guests  
      * On interact: large buff, small AOE buff, chance for bar fight with nearby guests  
      * Size: 3x2

    * #### Cornhole ($)

      * Requires 2 or 4 guests  
      * On interact: small buff  
      * Size: 6x2

    * #### Photo booth ($$)

      * Fits up to 5 guests  
      * On interact: small buff  
      * Small money payout  
      * Size: 2x1

    * #### Air hockey ($$)

      * Requires 2 guests  
      * On interact: small buff, small AOE debuff  
      * Size: 3x2

    * #### Foosball ($$)

      * Fits 2-4 guests  
      * On interact: small buff  
      * Size: 3x2

    * #### Shuffleboard ($$)

      * Requires 2 or 4 guests  
      * On interact: small buff, small AOE buff  
      * Size: 6x1

    * #### Game cabinet ($$)

      * Fits 1 guest  
      * On interact: large buff, small AOE buff  
      * Small money payout  
      * Size: 1x1

    * #### Pool table ($$$)

      * Fits 4 guests  
      * On interact: buff inverse to money payout, small AOE buff  
      * Size: 4x3

    * #### Golf sim ($$$)

      * Fits 1 guest  
      * On interact: large buff, small AOE buff  
      * Large money payout  
      * Size: 3x3

    * #### Mechanical bull ($$$$)

      * Fits 1 guest  
      * On interact: large buff, large AOE buff, chance for slip & fall  
      * Size: 8x8

    * #### Skeeball ($$$$)

      * Fits 4 guests  
      * On interact: large buff, large AOE buff  
      * Small money payout  
      * Size: 4x6

  # Menu processes

  * ### Beer

    * Grab from glass shelf  
    * Interact with draft system/lowboy fridge  
    * Serve

  * ### Dram

    * Grab from glass shelf  
    * Interact with spirits  
      * Guest can order on the rocks–interact with ice well  
    * Serve

  * ### Highball

    * Grab from glass shelf  
    * Interact with ice well  
    * Interact with spirits  
    * Interact with ingredients  
    * Serve

  * ### Mocktail

    * Grab from glass shelf  
    * Interact with ice well  
    * Interact with ingredients  
    * Serve

  * ### Wine (wine rack/lowboy fridge)

    * Grab from glass shelf  
    * Place on counter  
    * Grab from wine rack/lowboy fridge  
    * Action process  
      Opens new bottle, 5 pours per bottle, trash empty bottles  
    * Interact with glass  
    * Serve

  * ### Wine (draft system)

    * Grab from glass shelf  
    * Interact with draft system  
    * Serve

* ### Cocktail

  1. Grab from glass shelf  
  2. Place on counter  
  3. Grab from tin stack  
  4. Interact with ice well  
  5. Interact with spirits  
  6. Interact with ingredients  
  7. Action process  
  8. Interact with glass  
  9. Serve

     (Tin must be cleaned)

* ### Frozen drink (blender)

  1. Grab from glass shelf  
  2. Place on counter  
  3. Grab from blender  
  4. Interact with ice well  
  5. Interact with spirits  
  6. Interact with ingredients  
  7. Interact with blender  
  8. Automatic process  
  9. Grab from blender  
  10. Interact with glass  
  11. Serve

      (Blender must be cleaned)

* ### Frozen drink (slushy)

  1. Grab from liquor shelf  
  2. Interact with slushy  
  3. Grab from well caddy  
  4. Interact with slushy  
  5. Automatic process

     Creates new batch, 20 pours per batch, refill after empty

  6. Grab from glass shelf  
  7. Interact with slushy

* ### Plate

  1. Automatic process after order is taken  
  2. Grab from kitchen window  
  3. Serve

* ### Cigar

  1. Grab from humidor  
  2. Serve

* ### Takeout beer (lowboy fridge)

  1. Grab from beer fridge  
  2. Serve

* ### Takeout beer (beer canner)

  1. Grab from beer canner  
  2. Interact with beer taps  
  3. Interact with beer canner  
  4. Serve

  # Cleaning processes

  * Floor/counter/table mess  
    * On spot action process  
    * Messes accumulate & combine  
      * Larger messes  
        * Slowly decrease happiness of nearby guests  
        * Requires player to deposit mess in bin  
    * Floor messes can cause slip & falls  
  * Cleaning appliances/amenities  
    * On appliance action process (only during closing & prep)  
    * Chance to create mess or break during service if uncleaned for too long  
* Empty glasses/tins/blender cups (sink)  
  1. Grab empty  
  2. Place on sink

     Fits up to 2 glasses

  3. Action process  
  4. Grab from sink  
  5. Place on glass shelf  
* Empty glasses/tins/blender cups (dishwasher)  
  1. Grab empty  
  2. Place on dishwasher  
     		Fits up to 20 glasses  
  3. Automatic process  
  4. Grab from dishwasher  
  5. Place on glass shelf  
* Bussing plates  
  1. Grab plate  
  2. Place on kitchen window   
* Emptying trash  
  1. Grab bin liner  
  2. Place on garbage can (outside)

     Chance for bin liner to create mess

# Menu items

### Beers

Generic glass \-\> mug or tulip

* American lager ($)  
  * Mug  
    * Pale yellow  
  * Import lager ($$)  
    * Mug  
    * Pale yellow  
  * American cider ($)  
    * Mug  
    * Pale yellow  
  * French cider ($$)  
    * Tulip  
    * Pale yellow  
  * Shandy ($)  
    * Mug  
    * Opaque yellow  
  * Mead ($$)  
    * Mug  
    * Pale yellow  
  * NA beer ($$)  
    * Mug  
    * Pale yellow  
      (can be ordered by teetotaler guests)  
  * Euro blonde ale ($$)  
    * Tulip  
    * Bright yellow  
  * Craft pale ale ($$)  
    * Tulip  
    * Pale yellow  
  * Hazy IPA ($$)  
    * Tulip  
    * Opaque yellow  
  * Double IPA ($$)  
    * Tulip  
    * Bright yellow  
  * Triple IPA ($$$)  
    * Tulip  
    * Amber

			(increases drunkenness 1.5x)

* Farmhouse ale ($)  
  * Mug  
    * Pale yellow  
  * Saison ($$$)  
    * Tulip  
    * Amber  
  * Fruity wheat beer ($)  
    * Mug  
    * Pale yellow  
  * Hefeweizen ($)  
    * Mug  
    * Opaque yellow  
  * Witbier ($$)  
    * Mug  
    * Opaque yellow  
  * Nitro stout ($)  
    * Mug  
    * Black  
  * Coffee stout ($)  
    * Mug  
    * Black  
  * Imperial stout ($$)  
    * Mug  
    * Black  
  * American sour ($$)  
    * Tulip  
    * Bright yellow  
  * Lambic sour ($$$)  
    * Tulip  
    * Red  
  * Barleywine ($$$)  
    * Tulip  
    * Red  
  * Trappist ($$$)  
    * Tulip  
    * Red

### Wines

R \- red wines \-\> wine glass  
W \- white wines \-\> wine glass  
Sp \- sparkling wines \-\> flute  
Sa \- sake \-\> tokkuri & choko  
D \- dessert \-\> wine glass  
\*\* \- cannot be stocked in draft system

* Chilled wines  
  * Sp \- Moscato d’Asti ($)  
  * Sp \- California brut ($)  
  * Sp \- Lambrusco frizzante ($)  
  * Sp \- Prosecco ($)  
  * Sp \- Cava ($$)  
  * Sp\*\* \- Champagne ($$$$)  
  * W \- Pinot grigio ($)  
  * W \- Vermentino ($)  
  * W \- Finger Lakes riesling ($)  
  * W \- Sonoma chardonnay ($$)  
  * W \- German riesling ($$)  
  * W \- Orange wine ($$)  
  * W \- Sancerre ($$)  
  * W \- Marlborough ($$)  
  * W \- Rose blend ($)  
  * W \- Gewurztraminer ($)  
  * W \- Gruner veltliner ($$)  
  * W \- Vinho verde ($$)  
  * Sa \- Honjozo sake ($)  
  * Sa\*\* \- Nigori sake ($$)  
  * Sa\*\* \- Junmai daiginjo sake ($$$$)  
  * D\*\* \- Amontillado ($$)  
  * D\*\* \- Oloroso ($$)  
  * D\*\* \- Ice wine ($$)  
  * D\*\* \- Reserve tawny port ($$$)  
  * D\*\* \- Sauternes ($$$)  
* Non-chilled wines  
  * R \- Local red blend ($)  
  * R \- Australian shiraz ($)  
  * R \- Argentinian malbec ($)  
  * R \- Chianti Classico ($)  
  * R \- American merlot ($)  
  * R \- Vino Nobile ($$)  
  * R \- Cotes du rhone ($$)  
  * R \- Willamette pinot noir ($$)  
  * R \- Rioja tempranillo ($$)  
  * R \- Beaujolais nouveau ($$)  
  * R \- Super Tuscan ($$)  
  * R \- Burgundy ($$$)  
  * R \- Napa cabernet ($$$)  
  * R \- California Bordeaux ($$$)  
  * R \- Chateauneuf-du-pape ($$$)  
  * R \- Barolo ($$$)  
  * R\*\* \- Antique Bordeaux ($$$$$)

### Spirits

	Spirit \-\> shotglass  
	Ice \-\> tumbler  
	Vermouth \-\> wine glass

### Well Spirits

* Vodka ($)  
  * Gin ($)  
  * Tequila ($)  
  * Rum ($)  
  * Whiskey ($)

### Top Shelf Spirits

	Unlocked by purchasing liquor shelf  
	(can be stocked in liquor rail)

* Vermouths  
  * Rosso ($)  
    * Dry ($)  
    * Americano ($$)  
  * Bitters  
    * Aromatic bitters ($)  
      * Cannot be served in dram  
    * Aperitivo ($)  
    * Amaro ($$)  
    * Fernet ($$)  
  * Fruit cordials  
    * Apple pucker ($)  
    * Amaretto ($)  
    * Maraschino ($$)  
    * Curacao ($$$)  
  * Herbal liqueurs  
    * Violette ($)  
    * Elderflower ($$)  
    * Chartreuse ($$$$)  
  * Liquors  
    * Pisco ($)  
    * Mezcal ($$)  
    * Cognac ($$$)  
    * Absinthe ($$$)  
    * Extra anejo ($$$$)  
    * Single malt Scotch ($$$$)

### Ingredients

* Citrus  
  * Simple  
  * Mint  
  * Honey  
  * Tonic  
  * Club  
  * Cranberry  
  * Cola  
  * Limonata  
  * Coconut  
  * Ginger  
  * Pineapple  
  * Grenadine  
  * Jalapeno  
  * Cucumber  
  * Olive  
  * Egg (adds time to action process)  
  * Espresso

* ### Highballs

	Generic glass \-\> Collins

* Vodka  
  * Club  
    * Cola  
    * Tonic  
    * Cranberry  
    * Limonata  
    * Ginger  
    * Pineapple  
  * Rum  
    * Cola  
    * Ginger  
    * Pineapple  
  * Tequila  
    * Club  
    * Tonic  
    * Limonata  
    * Pineapple  
  * Gin  
    * Club  
    * Tonic  
    * Limonata  
  * Whiskey  
    * Ginger  
    * Club  
    * Cola  
    * Limonata  
  * Cognac  
    * Cola  
    * Cranberry  
    * Ginger  
    * Pineapple

* ### Mocktails

  Collins glass  
  Only ordered by teetotaler guests  
  * Citrus \- simple \- mint  
  * Cranberry \- simple \- tonic  
  * Grenadine \- limonata  
  * Citrus \- cola  
  * Grenadine \- cranberry \- cola  
  * Coconut \- pineapple \- citrus  
  * Espresso \- tonic  
  * Espresso \- simple \- coconut  
  * Cucumber \- mint \- citrus \- club

* ### Cocktails

  Generic glass \-\> drink specific glass  
  * Mojito

    Rum \- citrus \- simple \- mint \- club

    Collins

  * Dry martini

    Gin \- dry vermouth

    Nick & Nora

  * Dirty martini

    Vodka \- olive

    Nick & Nora

  * Aviation

    Gin \- citrus \- simple \- maraschino \- violette

    Nick & Nora

  * Cosmopolitan

    Vodka \- curacao \- simple \- citrus \- cranberry

    Nick & Nora

  * Spicy marg

    Tequila \- curacao \- citrus \- jalapeno

    Tumbler

  * Old fashioned

    Whiskey \- simple \- aromatic bitters

    Tumbler

  * Firing squad

    Tequila \- citrus \- grenadine \- jalapeno

    Tumbler

  * Dirty shirley

    Vodka \- citrus \- grenadine \- limonata

    Collins

  * Whiskey sour

    Whiskey \- citrus \- simple \- aromatic bitters \- egg

    Tumbler

  * New York sour

    Whiskey \- citrus \- simple \- aromatic bitters \- red wine

    Tumbler

  * Toronto

    Whiskey \- fernet

    Nick & Nora

  * Gold Rush

    Whiskey \- citrus \- honey

    Tumbler

  * Manhattan

    Whiskey \- rosso vermouth \- bitters

    Nick & Nora

  * Black Manhattan

    Whiskey \- amaro \- bitters

    Nick & Nora

  * Penicillin

    Whiskey \- citrus \- honey \- ginger

    Tumbler

  * Bees Knees

    Gin \- citrus \- honey

    Nick & Nora

  * Last word

    Gin \- citrus \- maraschino \- chartreuse

    Nick & Nora

  * Paper plane

    Whiskey \- citrus \- aperitivo \- amaro

    Nick & Nora

  * Naked & famous

    Mezcal \- aperitivo \- chartreuse \- citrus

    Nick & Nora

  * Corpse reviver no.2

    Gin \- americano \- curacao \- citrus \- absinthe

    Nick & Nora

  * Pisco sour

    Pisco \- citrus \- simple \- egg \- aromatic bitters

    Nick & Nora

  * Industry sour

    Fernet \- chartreuse- citrus \- simple

    Nick & Nora

  * Gimlet

    Gin \- citrus \- simple

    Nick & Nora

  * Amaretto sour

    Amaretto \- simple \- citrus \- egg

    Tumbler

  * French connection

    Cognac \- amaretto

    Tumbler

  * Negroni

    Gin \- rosso vermouth \- aperitivo

    Tumbler

  * Sbagliato

    Rosso vermouth \- aperitivo \- sparkling wine

    Nick & Nora

  * Sazerac

    Whiskey \- cognac \- aromatic bitters \- simple \- absinthe

    Tumbler

  * French 75

    Gin \- citrus \- simple \- sparkling wine

    Flute

  * Old Cuban

    Rum \- citrus \- simple \- mint \- sparkling wine

    Flute

  * Death in the afternoon

    Absinthe \- sparkling wine

    Flute

  * Moscow mule

    Vodka \- citrus \- simple \- ginger

    Tumbler

  * Sidecar

    Cognac \- curacao \- simple \- citrus

    Nick & Nora

  * Eastside

    Gin \- citrus \- simple \- cucumber \- mint

    Nick & Nora

  * Espresso martini

    Vodka \- espresso \- simple \- amaro

    Nick & Nora

  * Dark & stormy

    Rum \- citrus \- simple \- ginger

    Collins

  * Mexican mule

    Mezcal \- citrus \- simple \- ginger \- jalapeno

    Tumbler

### Frozen Drinks

	Generic glass \-\> hurricane

* Daiquiri

  Rum \- citrus \- simple

  * Sangria

    Red wine \- rum \- apple pucker \- citrus \- simple

  * Froze

    Rose blend \- vodka \- citrus \- simple

  * Appletini

    Vodka \- apple pucker \- citrus \- honey

  * Pina colada

    Rum \- citrus \- pineapple \- coconut \- simple

  * Margarita

    Tequila \- curacao \- citrus \- simple

  * Frappe

    Vodka \- espresso \- simple

    

# Guest statuses

* #### Waiting at door

  * Seats/standing room unavailable for whole party  
    * After timer expires, party leaves unaffected

    * #### Deciding

      * No interaction timer

    * #### Ready to order

      * Requires player interaction to reveal order  
      * After timer expires, happiness decreases (1.5x speed)

    * #### Waiting for order

      * Requires player to serve order  
        * Increases happiness  
      * After timer expires, happiness decreases (1x speed)

    * #### Drinking

      * Drunkenness increases (.25x faster after each order)  
      * After timer expires, Deciding status

    * #### Eating

      * After timer expires, Deciding status

    * #### Chatting

      * Randomly occurs during Drinking status  
      * Player interaction increases happiness  
      * No penalty after timer expires  
      * 4 interactions reveals random trait or preference

# Guest personalities

Procedurally generated:

* Name  
* Drink preference  
* Amenity preference  
* Seating preference  
* Trait preference  
* Rounds preference  
* Trait  
* Trait  
* Trait

All stats & unlocked information available on card  
Card viewable by interacting with guest during service/closing or examining during prep  
Regular guest will stop visiting after three visits with negative happiness  
Low random chance for regular guest to stop visiting  
Names  
Pools of first & last names can be edited  
Guests can be nicknamed after second visit

### Traits

* #### Lightweight

  * Drunkenness & happiness increase faster  
  * Mutually exclusive with lush trait

* #### Violent

  * Chance to start bar fight with nearby guests on low happiness/high drunkenness  
  * Chance for amenity to break after interact  
  * Mutually exclusive with elderly trait

* #### Chatty

  * Higher chance for Chatting status  
  * Player interaction on Chatting status chains to nearby guests  
  * Chatting timer expiring with no nearby guests decreases happiness

* #### Pretentious

  * Happiness does not increase unless served preferred drink  
    * Will order other drinks if preferred is unavailable

* #### Highroller

  * Happiness unaffected by high prices  
  * Chance to increase happiness of nearby guests  
  * Mutually exclusive with frugal trait

* #### Famous

  * Revealed immediately, not included in crazy trait randomizer  
  * Reputation payout/loss tripled, doubled for nearby guests  
  * Mutually exclusive with industry & underage traits

* #### Messy

  * Higher chance to create mess  
  * No happiness penalty from messes  
  * Mutually exclusive with cleanly trait

* #### Crazy

  * Traits hidden & randomized (from limited list) with each visit  
  * Chance to order random off-menu combination of ingredients/spirits

* #### Miserable

  * Happiness always decreasing  
  * Chance to decrease happiness of nearby guests  
  * Mutually exclusive with playful trait

* #### Artsy

  * Orders only one round without at least six wall art or art installation amenities

* #### Gourmand

  * Requires kitchen window appliance to enter  
  * Guaranteed to order at least three plates  
  * Happiness increase scales with kitchen staff budget

* #### Restless

  * Moves to random open seat/zone after each round if available  
  * Happiness increases slower with each round served in same seat/zone  
  * Standing room does not slow happiness increase

* #### Cleanly

  * Does not produce messes  
  * Nearby mess decreases happiness faster  
  * Players cleaning nearby messes increases happiness  
  * Mutually exclusive with messy trait

* #### Impatient

  * Faster movement  
  * Happiness decreases faster after status timers expire  
  * Happiness increase doubled if served drink with 50% of Waiting for drink status timer  
  * Waiting at door status timer halved

* #### Quiet

  * Chatting status occurs once per visit  
  * Canceled out by nearby chatty guests  
  * Mutually exclusive with chatty trait

* #### Eccentric

  * High happiness buffs all reputation payouts of nearby guests  
  * Chance for preferences to change on each visit

* #### Hilarious

  * High drunkenness buffs all reputation payouts of nearby guests

* #### Industry

  * Revealed immediately, not included in crazy trait randomizer  
  * Happiness does not decrease below threshold  
  * Reputation payout doubled  
  * Pays less money for each menu item  
  * Mutually exclusive with famous trait

* #### Underage

  * Revealed immediately, not included in crazy trait randomizer  
  * Happiness increases faster  
  * No happiness penalty from refusing service  
  * Increases chance to cause police sting  
  * Mutually exclusive with elderly trait

* #### Flirty

  * Randomly increases/decreases nearby guest happiness  
  * Happiness increases faster after player interaction

* #### Teetotaler

  * Revealed immediately  
  * Only orders mocktails/non alcoholic beer  
  * High drunkenness of nearby guests decreases happiness  
  * Mutually exclusive with lush & lightweight traits

* #### Insomniac

  * Does not show up during early window of shift  
  * Chance for drunkenness to increase significantly faster

* #### Elderly

  * Revealed immediately, not included in crazy trait randomizer  
  * All status timers are longer  
  * Slower movement  
  * Does not show up during later window of service  
  * Will not occupy standing room  
  * Higher chance of slip & fall  
  * Mutually exclusive with underage trait

* #### Private

  * Requires double the player interactions before trait/preference reveal  
  * Not included in crazy trait randomizer

* #### Playful

  * Requires amenity interact before ordering  
  * Amenity AOE buff increased for nearby guests  
  * Mutually exclusive with miserable trait

* #### Frugal

  * Price based happiness debuff increased  
  * Will not order more than randomly set price limit  
  * Cover charge will prevent any from entering  
  * Mutually exclusive with highroller trait

* #### Lush

  * Chance to enter bar above 0 drunkenness  
  * Drunkenness increases slower  
  * Severe happiness decrease if refused service  
  * Mutually exclusive with teetotaler & lightweight traits

* #### Oblivious

  * Immune to nearby guest traits  
  * Treats all zoned floorspace as standing room  
  * Happiness decreases slower  
  * Does not require seating with party

### Preferences

* #### Seating/zone

  * Can be type of seat/zone or individual seat/zone  
    * Individual seat/zone after second visit  
      * Types  
        * Bar counter  
        * Hightop  
        * Table  
        * Lounge chair  
        * Sofa  
        * Standing room zone  
        * Dancefloor  
  * Happiness increases faster in preferred seat/zone

* #### Drinks

  * Can be category (low buff), subcategory (mid buff), or specific item (high buff)  
    * Categories  
      * Beer  
        * No subcategories  
      * Wine  
        * Red  
        * White  
        * Sparkling  
        * Sake  
        * Dessert  
      * Spirits  
        * Drams  
        * Rocks  
        * Any item containing preferred spirit  
      * Cocktails  
      * Highballs  
      * Frozen drinks  
  * Serving preferred drink increases happiness faster

* #### Amenities

  * Buffs increased slightly for preferred amenity

* #### Traits

  * Nearby guests with preferred trait increases happiness faster

* #### Rounds

  * Determines how many drinks guest will order on service  
    * Set number for each guest, give or take random number each visit

# Bar vibes

Progressively unlocked in random order  
Higher reputation score raises money cost to select/unselect vibes  
Total vibes not capped but cannot add non-synergy vibe

* ### Sports Bar

  * Requires at least six TVs  
    * Happiness & drunkenness increases faster during certain set time windows  
      * Kitchen window appliance buffs all happiness payouts  
        * Common traits  
      * Violent  
      * Underage  
      * Teetotaler  
      * Chatty  
      * Messy  
      * Playful  
        * Extra amenity buffs  
      * TV  
      * Dartboard  
      * Skeeball  
      * Table tennis  
      * Golf sim  
      * Cornhole  
      * Foosball  
      * Shuffleboard  
      * Pool table  
        * Synergy vibes  
      * Dive bar  
      * Exclusive lounge  
      * College bar  
      * Barcade  
      * Gastropub  
      * Microbrewery

        * ### Dive Bar

          * Much higher happiness penalty from high menu prices  
          * First round served does not increase guest drunkenness  
          * Total menu items capped at 10  
          * Smaller reputation penalty for negative events  
          * Common traits  
      * Violent  
      * Lightweight  
      * Flirty  
      * Industry  
      * Messy  
      * Frugal  
        * Extra amenity buffs  
      * TV  
      * Jukebox  
      * Dartboard  
      * Pool table  
      * Quizmaster  
      * Rock band  
        * Synergy vibes  
      * Nightclub  
      * After hours  
      * College bar  
      * Smoking lounge

        * ### Cocktail Bar

          * Requires at least 8 cocktails on menu  
          * Lower happiness penalty from high menu prices  
          * Happiness raises faster with each additional cocktail or frozen drink on menu  
          * Small buff to reputation payouts for each cocktail training purchase  
          * Waiting for order timer doubled  
          * Common traits  
      * Eccentric  
      * Pretentious  
      * Industry  
      * Highroller  
      * Artsy  
      * Lush  
      * Miserable  
        * Extra amenity buffs  
      * Wall art  
      * Jazz band  
      * Quizmaster  
      * Pool table  
        * Synergy vibes  
      * Exclusive lounge  
      * Nightclub  
      * Smoking lounge  
      * Gastropub  
      * After hours  
      * Distillery

        * ### Nightclub

          * Cover charge does not lower happiness if under certain amount  
          * Requires a zoned dancefloor  
          * Smaller reputation penalty for negative events  
          * Total menu items capped at 10  
          * Common traits  
      * Underage  
      * Flirty  
      * Famous  
      * Violent  
      * Lightweight  
      * Messy  
        * Extra amenity buffs  
      * DJ booth  
      * Mechanical bull  
      * Photo booth  
      * Cage dancer  
        * Synergy vibes  
      * Dive bar  
      * Exclusive lounge  
      * After hours  
      * College bar

        * ### Exclusive Lounge

          * Low reputation score severely decreases guest count  
          * No happiness penalties from cover charge or high menu prices  
          * High drunkenness lowers reputation payout of nearby guests  
          * Waiting at door timer doubled & expiration gives small reputation payout  
          * Lower chance of negative events & worse reputation penalty  
          * Common traits  
      * Famous  
      * Highroller  
      * Eccentric  
      * Pretentious  
      * Cleanly  
      * Elderly  
        * Extra amenity buffs  
      * Wall art  
      * Art installation  
      * Jazz band  
        * Synergy vibes  
      * Nightclub  
      * Smoking lounge  
      * Cocktail bar  
      * Sports bar  
      * After hours  
      * Wine bar  
      * Distillery

        * ### Smoking Lounge

          * Unlocks humidor appliance  
          * Guest count increases significantly slower  
          * Double chance for all guests to become regulars  
          * Double happiness & reputation payouts for tequila, whiskey, mezcal, extra anejo, and single malt scotch  
          * Common traits  
      * Pretentious  
      * Highroller  
      * Eccentric  
      * Elderly  
      * Artsy  
        * No extra amenity buffs  
          * Synergy vibes  
      * Dive bar  
      * Exclusive lounge  
      * Cocktail bar  
      * After hours

        * ### Gastropub

          * Requires kitchen window appliance  
          * Guest happiness increases faster when seated at tables  
          * Guests require more interactions & orders  
          * High prices lower guest happiness slower  
          * Drunkenness raises slower  
          * Service errors lower happiness faster  
          * Happiness raises faster with each added menu item  
          * Common traits  
      * Highroller  
      * Eccentric  
      * Cleanly  
      * Gourmand  
      * Elderly  
      * Teetotaler  
    * No extra amenity buffs  
      * Synergy vibes  
      * Cocktail bar  
      * College bar  
      * Microbrewery  
      * Sports bar  
      * Distillery

        * ### After Hours

          * Extra time on service phase  
          * Service can continue during closing phase  
          * Player movement and action processes slower during closing phase  
          * Guest drunkenness increases faster during closing phase  
          * Guest happiness does not decrease below threshold during closing phase  
          * Higher reputation increases chance of police sting  
          * Common traits  
      * Industry  
      * Flirty  
      * Chatty  
      * Artsy  
      * Private  
      * Insomniac  
      * Crazy  
      * Miserable  
      * Violent  
        * Extra amenity boosts  
      * Jukebox  
      * Pool table  
      * Dartboard  
      * Game cabinet  
      * Cage dancer  
      * Quizmaster  
      * Karaoke  
        * Synergy vibes  
      * Dive bar  
      * College bar  
      * Cocktail bar  
      * Nightclub  
      * Exclusive lounge  
      * Smoking lounge

        * ### College Bar

          * Cover charge does not decrease happiness if under certain amount  
          * Reputation payouts doubled  
          * Budgeting cost for police bribes increased  
          * Happiness increases faster for each frozen drink item on menu  
          * Common traits:  
      * Underage  
      * Flirty  
      * Artsy  
      * Chatty  
      * Messy  
      * Restless  
      * Lightweight  
        * Extra amenity buffs  
      * Jukebox  
      * DJ booth  
      * Karaoke  
      * Table tennis  
      * Photo booth  
      * Rock band  
      * Quizmaster  
      * Game cabinet  
        * Synergy vibes  
      * Sports bar  
      * Dive bar  
      * Nightclub  
      * Barcade

        * ### Barcade

          * Requires at least 12 total interactive amenities, at least 50% must be game cabinets  
          * All amenity buffs doubled  
          * Common traits  
      * Lightweight  
      * Eccentric  
      * Teetotaler  
      * Underage  
      * Playful  
        * Synergy vibes  
      * College bar  
      * Dive bar  
      * Microbrewery  
      * Sports bar  
      * Cocktail bar

  * ### Wine Bar

    * Requires at least 20 wine/vermouth items on menu  
    * Each additional menu item increases reputation payout  
    * Happiness penalty for high prices decreases with each sommelier training purchase  
    * Common traits  
      * Pretentious  
      * Eccentric  
      * Highroller  
      * Miserable  
      * Quiet  
      * Lush  
      * Gourmand  
      * Elderly  
      * Artsy  
      * Chatty  
        (no teetotaler guests)  
    * Extra amenity buffs  
      * Jazz band  
      * Wall art  
      * Quizmaster  
    * Synergy vibes  
      * Gastropub  
      * Exclusive lounge

  * ### Microbrewery

    * Very high one time money cost  
    * Requires at least one level of cicerone training  
      * Adds brewing budget item  
    * Menu is restricted to beer items  
    * Stocking beer costs less money based on brewing budget  
      * Unlocks beer canner appliance  
      * Takeout beer can be sold

      Takes up no seats & requires no further interactions for guest happiness

      * Happiness penalty for high menu prices mitigated  
      * Reputation payouts scale with each additional beer item on menu  
      * Common traits  
      * Pretentious  
      * Industry  
      * Eccentric  
      * Violent  
      * Lightweight  
      * Miserable  
    * Extra amenity buffs  
      * Quizmaster  
      * Cornhole  
      * Pool table  
      * Shuffleboard  
    * Synergy vibes  
      * Gastropub  
      * College bar  
      * Sports bar

  * ### Distillery

    * Very high one time money cost  
    * Adds distilling budget item  
    * Stocking spirits costs less money based on distilling budget  
    * Random money payout during prep phase based on reputation score & distilling budget  
    * Reputation payouts scale with each additional stocked spirit  
    * Common traits  
      * Pretentious  
      * Eccentric  
      * Miserable  
      * Lush  
    * Extra amenity buffs  
      * Quizmaster  
      * Wall art  
      * Art installation  
    * Synergy vibes  
      * Gastropub  
      * Cocktail bar  
      * Exclusive lounge

# 

# Negative events

Random chance to occur scales with event specific modifiers

### Bar fight (---)

Caused by violent guests with high drunkenness & low happiness  
Players must interact with every guest involved (short action process)  
	Bouncer automates this process  
Every guest involved immediately leaves and never returns  
Higher chance for nearby appliances to break  
Happiness of nearby guests decreases

### Overserve (--)

Caused by high drunkenness  
Guest involved creates more messes & loses reputation payout  
Small chance to pass out, requiring player interaction & money cost to leave  
Each overserve increases chance of police sting

### Power outage (-)

Low chance random event  
Service ends early  
No reputation penalty  
Mitigated by budgeting for backup generator

### Toilet out of service (--)

Caused by high average drunkenness  
Chance reduced by budgeting for restroom fixtures  
Players must interact with water closet (long action process)  
All guest happiness decreases until resolved  
Mitigated by paying for extra water closets (which can also go out of service)

### Police sting (---)

Caused by overserves, after hours vibe, & serving underage guests  
Massive reputation penalty & money cost  
Chance lowered by budgeting for police bribes

### Slip & fall (-)

Caused by high drunkenness & big messes  
Players must bring ice to & interact with guest involved (long action process)  
Small chance for big money cost during next prep phase

### Robbery (---)

Low chance random event during closing phase  
Closing phase ends early with large money cost  
Mitigated by bouncer OR enough violent guests with high happiness

# Positive events

Random chance to occur scales with reputation score  
Player can opt out  
Chance increases with reputation score

### Happy hour

		Always available regardless of reputation score  
Unavailable for exclusive lounge vibe  
		Guarantees N extra guests show up during early window of service  
		Requires at least three menu items marked as discounted during window  
		High chance for guests to order discounted items during window

### Industry night

		Always available regardless of reputation score  
Guarantees all new guests are industry during late window of service  
			Lasts until closing  
		No money payout for plates served during window  
		Chance for messes greatly reduced during window

### Brand promotion

Requires specific items to be stocked for service  
	\*Beer rep: 4 beers  
		\*Unavailable for microbrewery vibe  
	Wine rep: 3 wines  
	\*Liquor rep: 2 spirits  
		\*Requires at least one cocktail  
\*Unavailable for distillery vibe  
Stocking specified items is cheaper  
Rep interacts with guests in bar at random  
	Chance for guest to order specified item after rep interact

### Private buyout

Money and reputation payouts are preset  
Set number of guests arrive early and do not leave until closing  
Average guest happiness must stay above X  
	If not met, reputation payout goes negative

### Influencer deal

		Unlocked after famous guest leaves above X happiness twice  
		Famous guest arrives in party size 4-6  
Party pays no money  
		Party happiness never drops below threshold  
Reputation payout increases by random modifier  
		Next rebranding cost halved

### Album release show

		Unlocked for nightclub, dive bar, college bar, exclusive lounge vibes  
		Requires cover charge  
Requires either DJ booth or rock band amenity in place for service  
		Preset percentage of all service revenue lost  
More guests enter bar, higher chance for famous guests

### Gallery exhibition

		Unlocked for exclusive lounge, cocktail bar, wine bar, & college bar vibes  
Requires 8 one-time free wall art or art installation amenities for service  
		Requires cover charge  
		All guests limited to two rounds/plates  
Drinking & Eating status timers doubled  
All reputation payouts doubled

### Supper club

		Unlocked for gastropub vibe  
		Money payout preset  
Party of set number of guests arrive all at once, must be sat at table  
All guests guaranteed to order five rounds of plates  
All reputation payouts doubled

# Holdable items

Placeable: can be put down  
Actionable: can be actioned while holding  
Grabbable: can be grabbed from while holding other item  
Interactable: can be used on other item  
Servable: can be given to guest

* #### Tin

  * Placeable  
    * Open slot  
    * Tin stack  
    * Sink  
    * Glasswasher  
  * Grabbable  
    * Glass  
  * Interactable  
    * Glass  
  * Actionable  
    * Required before grab/interact  
  * 1 charge after action  
    * Creates dirty tin

* #### Dirty Tin

  * Placeable  
    * Open slot  
    * Sink  
    * Glasswasher

* #### Blender Cup

  * Placeable  
    * Open slot  
    * Blender  
    * Sink  
    * Glasswasher  
  * Grabbable  
    * Glass  
  * Interactable  
    * Glass  
  * 1 charge after Blender automatic process  
    * Creates dirty blender cup

* #### Dirty Blender Cup

  * Placeable  
    * Open slot  
    * Blender  
    * Sink  
    * Glasswasher

* #### Glass

  \*\*visual changes pending grabs/interacts  
  * Placeable  
    * Open slot  
    * Glass shelf  
    * Sink  
    * Glasswasher  
  * Grabbable  
    * Spirit Bottle  
    * Wine Bottle  
    * Beer Bottle  
    * Ingredient  
    * Ice Well  
  * Interactable  
    * Spirit Bottle  
    * Wine Bottle  
    * Beer Bottle  
    * Ingredient  
    * Ice Well  
  * Servable  
    * After grab/interact

* #### Spirit Bottle

  * Grabbable  
    * Tin  
    * Glass  
    * Blender cup  
  * Placeable  
    * Open slot  
    * Liquor rail  
    * Liquor shelf  
  * Interactable  
    * Tin  
    * Glass  
    * Blender cup  
    * Slushy  
  * 20 charges  
    * Creates empty bottle

* #### Beer Bottle

  * Placeable  
    * Open slot  
    * Lowboy fridge  
  * Grabbable  
    * Glass  
  * Interactable  
    * Glass  
  * Servable  
    * Takeout beer  
  * 1 charge  
    * Creates empty bottle

* #### Wine Bottle

  * Grabbable  
    * Tin  
    * Blender cup  
    * Glass  
  * Placeable  
    * Open slot  
    * Wine rack  
    * Lowboy fridge  
  * Interactable  
    * Tin  
    * Glass  
    * Blender cup  
    * Slushy  
  * Actionable  
    * Required before interact/grab  
  * 5 charges after action  
    * Creates empty bottle

* #### Ingredients

  * Placeable  
    * Open slot  
    * Lowboy fridge  
    * Well caddy  
  * Grabbable  
    * Tin  
    * Glass  
    * Blender cup  
  * Interactable  
    * Tin  
    * Glass  
    * Blender cup  
    * Slushy  
  * Infinite charge

* #### Ice

  * Grabbable  
    * Tin  
    * Glass  
    * Blender cup  
  * Interactable  
    * Tin  
    * Glass  
    * Blender cup  
    * Slushy  
  * Servable  
    * Slip & fall  
  * 1 charge

* #### Empty Glass

  * Placeable  
    * Open slot  
    * Sink  
    * Glasswasher

* #### Empty Bottle

  * Placeable  
    * Open slot  
    * Bin  
    * Garbage can

* #### Bin Liner

  * Placeable  
    * Open tile  
    * Garbage can  
  * Chance to create mess in 3x3 zone

* #### Beer Can

  * Placeable  
    * Open slot  
    * Beer canner  
  * Interactable  
    * Beer taps  
  * Servable  
    * Takeout beer (after beer taps interact)

* #### Cigar

  * Placeable  
    * Open slot  
    * Humidor  
  * Servable

* #### Tray

  * Placeable  
    * Open slot  
    * Tray stand  
  * Interactable  
    * Plate (4)  
    * Glass (10)

* #### Plate

  * Placeable  
    * Open slot  
    * Kitchen window  
  * Servable

* #### Dirty Plate

  * Placeable  
    * Open slot  
    * Kitchen window

* #### Mop

  * Placeable  
    * Mop bucket  
    * Floor tile  
  * Actionable  
    * 2x speed floor mess cleaning