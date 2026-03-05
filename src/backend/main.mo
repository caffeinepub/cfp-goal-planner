import Float "mo:core/Float";
import Map "mo:core/Map";
import Iter "mo:core/Iter";
import Nat "mo:core/Nat";
import Array "mo:core/Array";
import Time "mo:core/Time";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Timer "mo:core/Timer";

actor {
  type Client = {
    id : Nat;
    name : Text;
    age : Nat;
    sex : Text;
    occupation : ?Text;
    income : ?Nat;
    phone : ?Text;
    email : ?Text;
    createdAt : Int;
  };

  module Client {
    public func compare(client1 : Client, client2 : Client) : Order.Order {
      Nat.compare(client1.id, client2.id);
    };
  };

  type Goal = {
    id : Nat;
    clientId : Nat;
    name : Text;
    presentValue : Nat;
    inflationRate : Float;
    timeHorizon : Nat;
    strategy : Text;
    strategyMean : Float;
    strategySD : Float;
    lumpSum : Nat;
    monthlySIP : Nat;
    monthlySIPStepUp : Float;
    annualSIP : Nat;
    annualSIPStepUp : Float;
    simCount : Nat;
    createdAt : Int;
    updatedAt : Int;
  };

  module Goal {
    public func compare(goal1 : Goal, goal2 : Goal) : Order.Order {
      Nat.compare(goal1.id, goal2.id);
    };
  };

  let clients = Map.empty<Nat, Client>();
  let goals = Map.empty<Nat, Goal>();

  var nextClientId = 1;
  var nextGoalId = 1;

  public shared ({ caller }) func createClient(
    name : Text,
    age : Nat,
    sex : Text,
    occupation : ?Text,
    income : ?Nat,
    phone : ?Text,
    email : ?Text,
  ) : async Nat {
    let id = nextClientId;
    nextClientId += 1;

    let client : Client = {
      id;
      name;
      age;
      sex;
      occupation;
      income;
      phone;
      email;
      createdAt = Time.now();
    };

    clients.add(id, client);
    id;
  };

  public query ({ caller }) func getClient(id : Nat) : async Client {
    switch (clients.get(id)) {
      case (null) { Runtime.trap("Client not found") };
      case (?client) { client };
    };
  };

  public query ({ caller }) func listClients() : async [Client] {
    clients.values().toArray().sort();
  };

  public shared ({ caller }) func updateClient(
    id : Nat,
    name : Text,
    age : Nat,
    sex : Text,
    occupation : ?Text,
    income : ?Nat,
    phone : ?Text,
    email : ?Text,
  ) : async () {
    switch (clients.get(id)) {
      case (null) { Runtime.trap("Client not found") };
      case (?_) {
        let updatedClient : Client = {
          id;
          name;
          age;
          sex;
          occupation;
          income;
          phone;
          email;
          createdAt = Time.now();
        };
        clients.add(id, updatedClient);
      };
    };
  };

  public shared ({ caller }) func deleteClient(id : Nat) : async () {
    if (not clients.containsKey(id)) {
      Runtime.trap("Client not found");
    };
    clients.remove(id);
  };

  public shared ({ caller }) func createGoal(
    clientId : Nat,
    name : Text,
    presentValue : Nat,
    inflationRate : Float,
    timeHorizon : Nat,
    strategy : Text,
    strategyMean : Float,
    strategySD : Float,
    lumpSum : Nat,
    monthlySIP : Nat,
    monthlySIPStepUp : Float,
    annualSIP : Nat,
    annualSIPStepUp : Float,
    simCount : Nat,
  ) : async Nat {
    if (not clients.containsKey(clientId)) {
      Runtime.trap("Client not found");
    };

    let id = nextGoalId;
    nextGoalId += 1;

    let goal : Goal = {
      id;
      clientId;
      name;
      presentValue;
      inflationRate;
      timeHorizon;
      strategy;
      strategyMean;
      strategySD;
      lumpSum;
      monthlySIP;
      monthlySIPStepUp;
      annualSIP;
      annualSIPStepUp;
      simCount;
      createdAt = Time.now();
      updatedAt = Time.now();
    };

    goals.add(id, goal);
    id;
  };

  public query ({ caller }) func getGoal(id : Nat) : async Goal {
    switch (goals.get(id)) {
      case (null) { Runtime.trap("Goal not found") };
      case (?goal) { goal };
    };
  };

  public query ({ caller }) func listGoalsByClient(clientId : Nat) : async [Goal] {
    if (not clients.containsKey(clientId)) {
      Runtime.trap("Client not found");
    };
    goals.values().toArray().filter(
      func(goal) {
        goal.clientId == clientId;
      }
    ).sort();
  };

  public shared ({ caller }) func updateGoal(
    id : Nat,
    clientId : Nat,
    name : Text,
    presentValue : Nat,
    inflationRate : Float,
    timeHorizon : Nat,
    strategy : Text,
    strategyMean : Float,
    strategySD : Float,
    lumpSum : Nat,
    monthlySIP : Nat,
    monthlySIPStepUp : Float,
    annualSIP : Nat,
    annualSIPStepUp : Float,
    simCount : Nat,
  ) : async () {
    if (not clients.containsKey(clientId)) {
      Runtime.trap("Client not found");
    };

    switch (goals.get(id)) {
      case (null) { Runtime.trap("Goal not found") };
      case (?_) {
        let updatedGoal : Goal = {
          id;
          clientId;
          name;
          presentValue;
          inflationRate;
          timeHorizon;
          strategy;
          strategyMean;
          strategySD;
          lumpSum;
          monthlySIP;
          monthlySIPStepUp;
          annualSIP;
          annualSIPStepUp;
          simCount;
          createdAt = Time.now();
          updatedAt = Time.now();
        };
        goals.add(id, updatedGoal);
      };
    };
  };

  public shared ({ caller }) func deleteGoal(id : Nat) : async () {
    if (not goals.containsKey(id)) {
      Runtime.trap("Goal not found");
    };
    goals.remove(id);
  };

  public query ({ caller }) func listAllGoals() : async [Goal] {
    goals.values().toArray().sort();
  };
};
