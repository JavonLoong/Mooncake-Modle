function Fruit(loader, kind, name) {
/**
 * A Fruit object consists of 2 half-fruit models(called children), when this
 * class is initialized, two half-fruit mesh are added into one Object3D.
 */
  console.log('Fruit.js:', 'Initializing fruit', kind);
  console.log('\tDS:', this);

  THREE.Object3D.call(this);
  var object1 = new THREE.Mesh(loader.objects[kind + '1'],
                               new THREE.MeshFaceMaterial());
  var object2 = new THREE.Mesh(loader.objects[kind + '2'],
                               new THREE.MeshFaceMaterial());
  this.add(object1);
  this.add(object2);
  this.position.z = 100;
  this.scale.set(2, 2, 2);
  this.rotationDelta = new THREE.Vector3(0, 0, 0);
  this.name = name;
  this.kind = kind;
}

Fruit.prototype = new THREE.Object3D();
Fruit.prototype.constructor = Fruit;

/**
 * Update the position and rotation of a fruit or its children.
 * If the fruit is not sliced, update it with its rotation delta and velocity;
 * If sliced, update its two children with rotation delta and velocity.
 */
Fruit.prototype.update = function() {
  if (!this.sliced) {
    this.rotation.addSelf(this.rotationDelta);
    if (this.velocity !== undefined) {
      this.position.addSelf(this.velocity);
      this.velocity.y -= 4.2 / 30;
    }
  }
  else {
    this.children.forEach(function(fruit) {
      fruit.rotation.addSelf(fruit.rotationDelta);
      fruit.position.addSelf(fruit.velocity);
      fruit.velocity.y -= 4.2 / 30;
    });
  }
};

/**
 * Reset velocity/position of fruit and its children.
 */
Fruit.prototype.reset = function() {
  console.log('Fruit.js:', 'Reseting fruit', this.kind);
  console.log('\tDS:', this);
  this.sliced = false;

  // reset fruit itself
  this.position.set(0, 0, 100);
  this.velocity = undefined;

  // reset children
  this.children.forEach(function(fruit) {
    fruit.position.set(0, 0, 0);
    fruit.rotation.set(0, 0, 0);
  });
};

/**
 * Drop a fruit.
 * If this fruit is sliced, drop its two children.
 * Otherwise, drop the complete fruit.
 * @param {boolean} sliced  whether the fruit has been sliced.
 * @param {float} direction the slice direction of sword.
 */
Fruit.prototype.drop = function(sliced, direction) {
  console.log('Fruit.js:', 'Dropping fruit', this.kind);
  console.log('\tDS:', this);
  if (sliced) {
    this.sliced = true;
    var x = this.rotation.x % (Math.PI * 2);
    var y = this.rotation.y % (Math.PI * 2);
    this.rotation.set(0, 0, 0);
    this.children.forEach(function(fruit) {
      // 1/2 PI ~ 3/2 PI set to PI
      var counter = 0;
      if (Math.abs(x - Math.PI) < (Math.PI / 2)) {
        fruit.rotation.x = Math.PI;
        counter += 1;
      } else {
        fruit.rotation.x = 0;
      }
      if (Math.abs(y - Math.PI) < (Math.PI / 2)) {
        fruit.rotation.y = Math.PI;
        counter += 1;
      } else {
        fruit.rotation.y = 0;
      }

      if (fruit.parent.kind == 'apple' ||
          fruit.parent.kind == 'watermelon' ||
          fruit.kind == 'orange')
      {
        fruit.rotation.z = -direction + Math.PI / 2;
      } else {
        fruit.rotation.z = -direction;
      }

      fruit.rotationDelta = new THREE.Vector3(0, Math.random() * 0.2 - 0.1, 0);
      fruit.velocity = new THREE.Vector3(Math.random() * 16 - 8,
                                         Math.random() * 5,
                                         0);
    });
  } else {
    this.velocity = new THREE.Vector3(Math.random() * 5 - 10,
                                      Math.random() * 5,
                                      0);
  }
};

function BombMesh() {
  THREE.Object3D.call(this);
  this.kind = 'bomb';
  this.sliced = false;
  this.velocity = undefined;
  this.rotationDelta = new THREE.Vector3(Math.random() * 0.05, Math.random() * 0.05, 0);

  var group = new THREE.Object3D();
  
  // Body (dark metallic sphere)
  var bodyGeo = new THREE.SphereGeometry(45, 16, 16);
  var bodyMat = new THREE.MeshPhongMaterial({ color: 0x191c20, shininess: 40 });
  var body = new THREE.Mesh(bodyGeo, bodyMat);
  group.add(body);

  // Cap (metal cylinder)
  var capGeo = new THREE.CylinderGeometry(10, 15, 15, 16);
  var capMat = new THREE.MeshPhongMaterial({ color: 0x60656a, shininess: 40 });
  var cap = new THREE.Mesh(capGeo, capMat);
  cap.position.y = 48;
  group.add(cap);

  // Fuse (torus)
  var fuseGeo = new THREE.TorusGeometry(18, 3, 8, 16);
  var fuseMat = new THREE.MeshBasicMaterial({ color: 0xd89f45 });
  var fuse = new THREE.Mesh(fuseGeo, fuseMat);
  fuse.position.set(5, 60, 0);
  fuse.rotation.z = 0.72;
  group.add(fuse);

  // Spark/Ember (flashing orange sphere)
  var sparkGeo = new THREE.SphereGeometry(6, 8, 8);
  var sparkMat = new THREE.MeshBasicMaterial({ color: 0xff7040 });
  var spark = new THREE.Mesh(sparkGeo, sparkMat);
  spark.position.set(20, 70, 0);
  group.add(spark);

  this.add(group);
  this.position.z = 100;
  this.name = 'bomb';
}
BombMesh.prototype = new THREE.Object3D();
BombMesh.prototype.constructor = BombMesh;

BombMesh.prototype.update = function() {
  if (!this.sliced) {
    this.rotation.addSelf(this.rotationDelta);
    if (this.velocity !== undefined) {
      this.position.addSelf(this.velocity);
      this.velocity.y -= 4.2 / 30; // standard gravity match
    }
  }
};

BombMesh.prototype.reset = function() {
  this.sliced = false;
  this.position.set(0, 0, 100);
  this.velocity = undefined;
};

BombMesh.prototype.drop = function(sliced, direction) {
  this.sliced = true;
};
