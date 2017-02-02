/*global defineSuite*/
defineSuite([
        'Scene/Batched3DModel3DTileContent',
        'Core/Cartesian3',
        'Core/deprecationWarning',
        'Core/HeadingPitchRange',
        'Core/HeadingPitchRoll',
        'Core/loadArrayBuffer',
        'Core/Transforms',
        'Specs/Cesium3DTilesTester',
        'Specs/createScene'
    ], function(
        Batched3DModel3DTileContent,
        Cartesian3,
        deprecationWarning,
        HeadingPitchRange,
        HeadingPitchRoll,
        loadArrayBuffer,
        Transforms,
        Cesium3DTilesTester,
        createScene) {
    'use strict';

    var scene;
    var centerLongitude = -1.31968;
    var centerLatitude = 0.698874;

    var withBatchTableUrl = './Data/Cesium3DTiles/Batched/BatchedWithBatchTable/';
    var withBatchTableBinaryUrl = './Data/Cesium3DTiles/Batched/BatchedWithBatchTableBinary/';
    var withoutBatchTableUrl = './Data/Cesium3DTiles/Batched/BatchedWithoutBatchTable/';
    var translucentUrl = './Data/Cesium3DTiles/Batched/BatchedTranslucent/';
    var translucentOpaqueMixUrl = './Data/Cesium3DTiles/Batched/BatchedTranslucentOpaqueMix/';
    var withKHRMaterialsCommonUrl = './Data/Cesium3DTiles/Batched/BatchedWithKHRMaterialsCommon/';
    var withTransformBoxUrl = './Data/Cesium3DTiles/Batched/BatchedWithTransformBox/';
    var withTransformSphereUrl = './Data/Cesium3DTiles/Batched/BatchedWithTransformSphere/';
    var withTransformRegionUrl = './Data/Cesium3DTiles/Batched/BatchedWithTransformRegion/';
    var withoutBatchTableB3dmUrl = withoutBatchTableUrl + 'batchedWithoutBatchTable.b3dm';

    function setCamera(longitude, latitude) {
        // One feature is located at the center, point the camera there
        var center = Cartesian3.fromRadians(longitude, latitude);
        scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 15.0));
    }

    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    beforeEach(function() {
        setCamera(centerLongitude, centerLatitude);
    });

    afterEach(function() {
        scene.primitives.removeAll();
    });

    it('throws with invalid magic', function() {
        var arrayBuffer = Cesium3DTilesTester.generateBatchedTileBuffer({
            magic : [120, 120, 120, 120]
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'b3dm');
    });

    it('throws with invalid version', function() {
        var arrayBuffer = Cesium3DTilesTester.generateBatchedTileBuffer({
            version: 2
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'b3dm');
    });

    it('recognizes the legacy b3dm format', function() {
        return loadArrayBuffer(withoutBatchTableB3dmUrl).then(function(glbBuffer) {
            // Extract a glb from an existing tile
            var glbStart = 24;
            var glbEnd = glbBuffer.byteLength;
            var glbLength = glbEnd - glbStart;
            var glbUint8Array = new Uint8Array(glbBuffer, glbStart, glbLength);

            var headerByteLength = 20;
            var batchTableJson = {name : ['testing']};
            var batchTableString = JSON.stringify(batchTableJson);
            var batchTableByteLength = batchTableString.length;
            var byteLength = headerByteLength + batchTableByteLength + glbLength;
            var buffer = new ArrayBuffer(byteLength);
            var view = new DataView(buffer);
            var magic = [98, 51, 100, 109];
            var version = 1;
            var batchLength = 1;

            view.setUint8(0, magic[0]);
            view.setUint8(1, magic[1]);
            view.setUint8(2, magic[2]);
            view.setUint8(3, magic[3]);
            view.setUint32(4, version, true);
            view.setUint32(8, byteLength, true);
            view.setUint32(12, batchLength, true);
            view.setUint32(16, batchTableByteLength, true);

            var i;
            var byteOffset = headerByteLength;
            for (i = 0; i < batchTableByteLength; i++) {
                view.setUint8(byteOffset, batchTableString.charCodeAt(i));
                byteOffset++;
            }

            var b3dmUint8Array = new Uint8Array(buffer);
            b3dmUint8Array.set(glbUint8Array, byteOffset);

            var tile = Cesium3DTilesTester.loadTile(scene, buffer, 'b3dm');
            expect(tile.batchTable.batchTableJson).toEqual(batchTableJson);
            expect(tile.batchTable.batchTableBinary).toBeUndefined();
            expect(tile.batchTable.featuresLength).toEqual(1);
        });
    });

    it('logs deprecation warning for use of BATCHID without prefixed underscore', function() {
        spyOn(Batched3DModel3DTileContent, '_deprecationWarning');
        return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl)
            .then(function(tileset) {
                expect(Batched3DModel3DTileContent._deprecationWarning).toHaveBeenCalled();
                Cesium3DTilesTester.expectRenderTileset(scene, tileset);
            });
    });

    it('throws with empty gltf', function() {
        // Expect to throw DeveloperError in Model due to invalid gltf magic
        var arrayBuffer = Cesium3DTilesTester.generateBatchedTileBuffer();
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'b3dm');
    });

    it('resolves readyPromise', function() {
        return Cesium3DTilesTester.resolvesReadyPromise(scene, withoutBatchTableUrl);
    });

    it('rejects readyPromise on failed request', function() {
        return Cesium3DTilesTester.rejectsReadyPromiseOnFailedRequest('b3dm');
    });

    it('renders with batch table', function() {
        return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders with batch table binary', function() {
        return Cesium3DTilesTester.loadTileset(scene, withBatchTableBinaryUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders without batch table', function() {
        return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders with all features translucent', function() {
        return Cesium3DTilesTester.loadTileset(scene, translucentUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders with a mix of opaque and translucent features', function() {
        return Cesium3DTilesTester.loadTileset(scene, translucentOpaqueMixUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders with KHR_materials_common extension', function() {
        // Tests that the batchId attribute and CESIUM_RTC extension are handled correctly
        return Cesium3DTilesTester.loadTileset(scene, withKHRMaterialsCommonUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    function expectRenderWithTransform(url) {
        return Cesium3DTilesTester.loadTileset(scene, url).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);

            var newLongitude = -1.31962;
            var newLatitude = 0.698874;
            var newCenter = Cartesian3.fromRadians(newLongitude, newLatitude, 0.0);
            var newHPR = new HeadingPitchRoll();
            var newTransform = Transforms.headingPitchRollToFixedFrame(newCenter, newHPR);

            // Update tile transform
            tileset._root.transform = newTransform;
            scene.renderForSpecs();

            // Move the camera to the new location
            setCamera(newLongitude, newLatitude);
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    }

    it('renders with a tile transform and box bounding volume', function() {
        return expectRenderWithTransform(withTransformBoxUrl);
    });

    it('renders with a tile transform and sphere bounding volume', function() {
        return expectRenderWithTransform(withTransformSphereUrl);
    });

    it('renders with a tile transform and region bounding volume', function() {
        return Cesium3DTilesTester.loadTileset(scene, withTransformRegionUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('can get features and properties', function() {
        return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl).then(function(tileset) {
            var content = tileset._root.content;
            expect(content.featuresLength).toBe(10);
            expect(content.innerContents).toBeUndefined();
            expect(content.hasProperty(0, 'id')).toBe(true);
            expect(content.getFeature(0)).toBeDefined();
        });
    });

    it('throws when calling getFeature with invalid index', function() {
        return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(function(tileset) {
            var content = tileset._root.content;
            expect(function(){
                content.getFeature(-1);
            }).toThrowDeveloperError();
            expect(function(){
                content.getFeature(1000);
            }).toThrowDeveloperError();
            expect(function(){
                content.getFeature();
            }).toThrowDeveloperError();
        });
    });

    it('destroys', function() {
        return Cesium3DTilesTester.tileDestroys(scene, withoutBatchTableUrl);
    });

    it('destroys before loading finishes', function() {
        return Cesium3DTilesTester.tileDestroysBeforeLoad(scene, withoutBatchTableUrl);
    });

}, 'WebGL');
